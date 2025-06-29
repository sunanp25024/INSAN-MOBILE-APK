
'use server';

import { admin, adminAuth, adminDb } from '@/lib/firebaseAdmin';
import type { UserProfile, UserRole, ApprovalRequest } from '@/types';
import { getStorage } from 'firebase-admin/storage';

/**
 * Creates a user account in Firebase Auth and their profile in Firestore
 * using the Firebase Admin SDK.
 *
 * @param email The new user's email.
 * @param password The new user's password.
 * @param profileData The profile data for the user to be stored in Firestore.
 * @returns An object with the success status and a message or error code.
 */
export async function createUserAccount(
  email: string,
  password: string,
  profileData: Omit<UserProfile, 'uid'>
) {
  try {
    // 1. Create the user in Firebase Authentication.
    const userRecord = await adminAuth.createUser({
      email: email,
      password: password,
      displayName: profileData.fullName,
      disabled: profileData.status === 'Nonaktif',
    });

    // 2. Prepare the full profile object with the new UID from Auth.
    const fullProfile: UserProfile = {
      ...profileData,
      uid: userRecord.uid,
      createdAt: new Date().toISOString(),
    };

    // 3. Save the complete user profile to the 'users' collection in Firestore.
    await adminDb.collection('users').doc(userRecord.uid).set(fullProfile);

    return { success: true, message: 'User created successfully.', uid: userRecord.uid };
  } catch (error: any) {
    console.error('Error in createUserAccount server action:', error);
    
    // If user was created in Auth but Firestore failed, we should delete the Auth user to prevent orphans.
    if (error.code !== 'auth/email-already-in-use' && error.uid) {
        await adminAuth.deleteUser(error.uid);
    }
    
    return {
      success: false,
      message: `Failed to create user: ${error.message}`,
      errorCode: error.code,
    };
  }
}

/**
 * Deletes a user account from Firebase Auth and their profile from Firestore
 * using the Firebase Admin SDK.
 *
 * @param uid The UID of the user to delete.
 * @returns An object with the success status and a message.
 */
export async function deleteUserAccount(uid: string) {
  if (!uid) {
    return { success: false, message: 'User UID is required.' };
  }

  try {
    // First, delete the user from Firebase Authentication.
    await adminAuth.deleteUser(uid);
    
    // Then, delete the user's profile from Firestore.
    await adminDb.collection('users').doc(uid).delete();

    return { success: true, message: 'User deleted successfully from Auth and Firestore.' };
  } catch (error: any) {
    console.error(`Error deleting user ${uid}:`, error);
    
    // If the user was deleted from Auth but not Firestore (or vice-versa),
    // this could be logged for manual cleanup. For now, we return a generic error.
    return {
      success: false,
      message: `Failed to delete user: ${error.message}`,
      errorCode: error.code,
    };
  }
}

/**
 * Submits a request to delete a user, which requires MasterAdmin approval.
 *
 * @param userToDelete The user profile to request deletion for.
 * @param requesterProfile The profile of the Admin making the request.
 * @returns An object with the success status and a message.
 */
export async function requestUserDeletion(
  userToDelete: UserProfile,
  requesterProfile: { uid: string; fullName: string; role: UserRole }
) {
  if (requesterProfile.role !== 'Admin') {
    return { success: false, message: 'Hanya Admin yang dapat mengajukan penghapusan.' };
  }
  if (!userToDelete.uid || !userToDelete.id) {
    return { success: false, message: 'Data pengguna yang akan dihapus tidak lengkap.'};
  }

  const approvalRequest: Omit<ApprovalRequest, 'id'> = {
    type: 'DELETE_USER',
    status: 'pending',
    requestedByUid: requesterProfile.uid,
    requestedByName: requesterProfile.fullName,
    requestedByRole: requesterProfile.role,
    requestTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    targetEntityType: 'USER_PROFILE_DATA',
    targetEntityId: userToDelete.uid,
    targetEntityName: userToDelete.fullName,
    payload: { 
      uid: userToDelete.uid,
      id: userToDelete.id,
      fullName: userToDelete.fullName,
      email: userToDelete.email,
      role: userToDelete.role,
     },
    notesFromRequester: `Pengajuan penghapusan untuk pengguna: ${userToDelete.fullName} (ID: ${userToDelete.id}, Role: ${userToDelete.role}).`,
  };

  try {
    await adminDb.collection('approval_requests').add(approvalRequest);
    return { success: true, message: 'Permintaan penghapusan telah berhasil diajukan.' };
  } catch (error: any) {
    console.error('Error requesting user deletion:', error);
    return { success: false, message: `Gagal mengajukan permintaan: ${error.message}` };
  }
}


export async function importUsers(
  usersData: any[],
  role: UserRole,
  creatorProfile: { uid: string; fullName: string; role: UserRole }
) {
  let createdCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const [index, userData] of usersData.entries()) {
    const rowNum = index + 2; // Excel rows are 1-based, plus header

    try {
        let emailForAuth: string;
        let appUserId: string;
        let profileToCreate: Omit<UserProfile, 'uid'>;

        // Helper to check for missing fields and return a formatted error string
        const getMissingFieldsError = (requiredFields: Record<string, string>, data: any): string | null => {
            const missingFields = Object.entries(requiredFields)
                .filter(([key]) => !data[key] || String(data[key]).trim() === '')
                .map(([, value]) => value);

            if (missingFields.length > 0) {
                return `Baris ${rowNum}: Kolom berikut wajib diisi: ${missingFields.join(', ')}.`;
            }
            return null;
        };

      switch (role) {
        case 'Admin':
          const requiredAdminFields = { fullName: 'Nama Lengkap', email: 'Email', passwordValue: 'Password' };
          const adminValidationError = getMissingFieldsError(requiredAdminFields, userData);
          if (adminValidationError) {
              errors.push(adminValidationError);
              failedCount++;
              continue;
          }

          emailForAuth = String(userData.email).trim();
          appUserId = userData.id?.toString().trim() || `ADMIN${String(Date.now()).slice(-6) + index}`;
          profileToCreate = {
            id: appUserId,
            fullName: String(userData.fullName).trim(),
            email: emailForAuth,
            role: 'Admin',
            status: 'Aktif',
            joinDate: new Date().toISOString(),
            createdBy: creatorProfile,
          };
          break;

        case 'PIC':
          const requiredPicFields = { fullName: 'Nama Lengkap', email: 'Email', passwordValue: 'Password', workLocation: 'Area Tanggung Jawab' };
          const picValidationError = getMissingFieldsError(requiredPicFields, userData);
          if (picValidationError) {
              errors.push(picValidationError);
              failedCount++;
              continue;
          }

          emailForAuth = String(userData.email).trim();
          appUserId = userData.id?.toString().trim() || `PIC${String(Date.now()).slice(-6) + index}`;
          profileToCreate = {
            id: appUserId,
            fullName: String(userData.fullName).trim(),
            email: emailForAuth,
            role: 'PIC',
            status: 'Aktif',
            workLocation: String(userData.workLocation).trim(),
            joinDate: new Date().toISOString(),
            createdBy: creatorProfile,
          };
          break;

        case 'Kurir':
          const requiredKurirFields = {
            fullName: 'Nama Lengkap', nik: 'NIK', passwordValue: 'Password', jabatan: 'Jabatan',
            wilayah: 'Wilayah', area: 'Area', workLocation: 'Lokasi Kerja (Hub)',
            joinDate: 'Tanggal Join', contractStatus: 'Status Kontrak',
          };
          const kurirValidationError = getMissingFieldsError(requiredKurirFields, userData);
          if (kurirValidationError) {
              errors.push(kurirValidationError);
              failedCount++;
              continue;
          }

          // Specific content validation for Kurir
          const nik = String(userData.nik).trim();
          if (!/^\d{16}$/.test(nik)) {
              errors.push(`Baris ${rowNum}: NIK '${nik}' tidak valid, harus 16 digit angka.`);
              failedCount++;
              continue;
          }

          const bankAccNumber = userData.bankAccountNumber ? String(userData.bankAccountNumber).trim() : '';
          if (bankAccNumber && !/^\d+$/.test(bankAccNumber)) {
              errors.push(`Baris ${rowNum}: Nomor Rekening '${bankAccNumber}' tidak valid, hanya boleh berisi angka.`);
              failedCount++;
              continue;
          }

          let joinDate: Date;
          if (typeof userData.joinDate === 'number') {
             // Handle Excel's date serial number format
             joinDate = new Date(Math.round((userData.joinDate - 25569) * 86400 * 1000));
          } else {
             // Handle string date format
             joinDate = new Date(String(userData.joinDate).trim());
          }
          
          if (isNaN(joinDate.getTime())) {
             errors.push(`Baris ${rowNum}: Format Tanggal Join '${String(userData.joinDate)}' tidak valid. Gunakan format YYYY-MM-DD, contoh: 2025-06-24.`);
             failedCount++;
             continue;
          }

          appUserId = userData.id?.toString().trim() || `K${String(Date.now()).slice(-7) + index}`;
          emailForAuth = userData.email?.trim() || `${appUserId.toLowerCase().replace(/\s+/g, '.')}@internal.spx`;
          
          profileToCreate = {
            id: appUserId,
            fullName: String(userData.fullName).trim(),
            nik: nik,
            email: emailForAuth,
            role: 'Kurir',
            position: String(userData.jabatan).trim(),
            wilayah: String(userData.wilayah).trim(),
            area: String(userData.area).trim(),
            workLocation: String(userData.workLocation).trim(),
            joinDate: joinDate.toISOString(),
            contractStatus: String(userData.contractStatus).trim(),
            bankName: String(userData.bankName || '').trim(),
            bankAccountNumber: bankAccNumber,
            bankRecipientName: String(userData.bankRecipientName || '').trim(),
            status: 'Aktif',
            createdBy: creatorProfile,
          };
          break;
        
        default:
          throw new Error("Peran tidak valid untuk impor");
      }

      const result = await createUserAccount(emailForAuth, String(userData.passwordValue), profileToCreate);
      if (result.success) {
        createdCount++;
      } else {
        failedCount++;
        errors.push(`Baris ${rowNum} (${userData.fullName}): ${result.message}`);
      }
    } catch (e: any) {
        failedCount++;
        errors.push(`Baris ${rowNum} (${userData.fullName || 'N/A'}): Terjadi error tak terduga - ${e.message}`);
    }
  }

  return {
    success: createdCount > 0 && failedCount === 0,
    createdCount,
    failedCount,
    totalRows: usersData.length,
    errors,
  };
}


export async function handleApprovalRequest(
  requestId: string,
  decision: 'approved' | 'rejected',
  handlerProfile: { uid: string; name: string; role: UserRole },
  notesFromHandler?: string
) {
  if (handlerProfile.role !== 'MasterAdmin') {
    return { success: false, message: 'Hanya MasterAdmin yang dapat memproses persetujuan.' };
  }

  const requestDocRef = adminDb.collection('approval_requests').doc(requestId);

  try {
    await adminDb.runTransaction(async (transaction) => {
      const requestDoc = await transaction.get(requestDocRef);
      if (!requestDoc.exists) {
        throw new Error('Permintaan persetujuan tidak ditemukan.');
      }
      const requestData = requestDoc.data() as ApprovalRequest;
      if (requestData.status !== 'pending') {
        throw new Error(`Permintaan ini sudah diproses dengan status: ${requestData.status}.`);
      }

      const updateDataForRequest = {
        status: decision,
        handledByUid: handlerProfile.uid,
        handledByName: handlerProfile.name,
        actionTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        notesFromHandler: notesFromHandler || '',
      };

      if (decision === 'approved') {
        const { type, payload, targetEntityId } = requestData;
        
        switch (type) {
          case 'NEW_USER_PIC':
          case 'NEW_USER_ADMIN':
          case 'NEW_USER_KURIR':
            const { passwordValue, ...profilePayload } = payload;
            profilePayload.status = 'Aktif'; 
            
            if (!passwordValue) {
                throw new Error('Password tidak ditemukan dalam payload untuk user baru.');
            }
            const creationResult = await createUserAccount(profilePayload.email, passwordValue, profilePayload);
            if (!creationResult.success) {
                throw new Error(creationResult.message || 'Gagal membuat akun pengguna baru saat persetujuan.');
            }
            break;

          case 'UPDATE_USER_PROFILE':
            if (!targetEntityId) throw new Error('Target UID untuk update tidak ditemukan.');
            const userToUpdateRef = adminDb.collection('users').doc(targetEntityId);
            transaction.update(userToUpdateRef, { ...payload, status: 'Aktif' });
            break;
            
          case 'ACTIVATE_USER':
          case 'DEACTIVATE_USER':
            if (!targetEntityId) throw new Error('Target UID untuk perubahan status tidak ditemukan.');
            const userToChangeStatusRef = adminDb.collection('users').doc(targetEntityId);
            transaction.update(userToChangeStatusRef, { status: payload.status });
            await adminAuth.updateUser(targetEntityId, { disabled: payload.status === 'Nonaktif' });
            break;

          case 'DELETE_USER':
            if (!targetEntityId) throw new Error('Target UID untuk penghapusan tidak ditemukan.');
            const deletionResult = await deleteUserAccount(targetEntityId);
            if (!deletionResult.success) {
              throw new Error(deletionResult.message || 'Gagal menghapus akun pengguna saat menyetujui permintaan.');
            }
            break;
            
          default:
            throw new Error(`Jenis persetujuan tidak dikenal: ${type}`);
        }
      } 

      transaction.update(requestDocRef, updateDataForRequest);
    });

    return { success: true, message: `Permintaan berhasil di-${decision}.` };
  } catch (error: any) {
    console.error('Error handling approval request:', error);
    return { success: false, message: error.message };
  }
}


export async function updateUserStatus(
  uid: string,
  newStatus: 'Aktif' | 'Nonaktif',
  handlerProfile: { uid: string; name: string; role: UserRole }
) {
  if (!uid) {
    return { success: false, message: 'User UID is required.' };
  }
  if (handlerProfile.role !== 'MasterAdmin') {
    return { success: false, message: 'Only MasterAdmin can change user status directly.' };
  }

  try {
    const userToUpdateRef = adminDb.collection('users').doc(uid);

    // Using a transaction to ensure atomicity of the Firestore update
    await adminDb.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userToUpdateRef);
        if (!userDoc.exists) {
            throw new Error("User profile not found in Firestore.");
        }
        
        // Update Firestore document within the transaction
        transaction.update(userToUpdateRef, {
          status: newStatus,
          updatedAt: new Date().toISOString(),
          updatedBy: { uid: handlerProfile.uid, name: handlerProfile.name, role: handlerProfile.role },
        });
    });

    // After the transaction succeeds, update the Firebase Auth user's disabled status
    await adminAuth.updateUser(uid, { disabled: newStatus === 'Nonaktif' });

    return { success: true, message: 'User status updated successfully.' };
  } catch (error: any) {
    console.error(`Error updating status for user ${uid}:`, error);
    return {
      success: false,
      message: `Failed to update user status: ${error.message}`,
      errorCode: error.code,
    };
  }
}

/**
 * Resets a user's password using the Firebase Admin SDK.
 * This is a privileged action only for MasterAdmins.
 *
 * @param uid The UID of the user whose password will be reset.
 * @param newPassword The new temporary password for the user.
 * @returns An object with the success status and a message.
 */
export async function resetUserPassword(uid: string, newPassword: string) {
  if (!uid || !newPassword) {
    return { success: false, message: 'User UID and new password are required.' };
  }
  if (newPassword.length < 6) {
    return { success: false, message: 'Password baru minimal 6 karakter.' };
  }

  try {
    await adminAuth.updateUser(uid, {
      password: newPassword,
    });
    return { success: true, message: 'Password pengguna berhasil direset.' };
  } catch (error: any) {
    console.error(`Error resetting password for user ${uid}:`, error);
    return {
      success: false,
      message: `Gagal mereset password: ${error.message}`,
      errorCode: error.code,
    };
  }
}

/**
 * Uploads a file from a data URL to Firebase Storage using the Admin SDK.
 * This is used to bypass client-side CORS issues.
 * @param filePath The full path in the storage bucket (e.g., 'delivery_proofs/task_id/image.jpg').
 * @param dataUrl The base64 encoded data URL of the file.
 * @returns An object with the success status and the public download URL.
 */
export async function uploadFileToServer(filePath: string, dataUrl: string) {
  try {
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      throw new Error('Firebase Storage bucket name is not configured in environment variables (FIREBASE_STORAGE_BUCKET).');
    }
    const bucket = admin.storage().bucket(bucketName);
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      throw new Error('Invalid data URL format.');
    }
    const contentType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    const file = bucket.file(filePath);

    await file.save(buffer, {
      metadata: {
        contentType: contentType,
      },
    });
    
    // Using a signed URL is more secure than making files public
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491', // A far-future date
    });
    
    return { success: true, url: url };

  } catch (error: any) {
    console.error(`Error uploading file to ${filePath}:`, error);
    return { success: false, message: `Failed to upload file: ${error.message}` };
  }
}
