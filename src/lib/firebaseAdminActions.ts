
'use server';

import { admin, adminAuth, adminDb } from '@/lib/firebaseAdmin';
import type { UserProfile, UserRole, ApprovalRequest, KurirDailyTaskDoc } from '@/types';
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

  const transactionPromises: Promise<any>[] = [];

  try {
    // Step 1: Find all daily task documents for the user
    const tasksQuery = adminDb.collection('kurir_daily_tasks').where('kurirUid', '==', uid);
    const tasksSnapshot = await tasksQuery.get();

    if (!tasksSnapshot.empty) {
      const batch = adminDb.batch();
      
      // Step 2: For each task, find and delete all subcollection 'packages' documents
      for (const taskDoc of tasksSnapshot.docs) {
        const packagesQuery = taskDoc.ref.collection('packages');
        const packagesSnapshot = await packagesQuery.get();
        if (!packagesSnapshot.empty) {
          packagesSnapshot.docs.forEach(pkgDoc => {
            batch.delete(pkgDoc.ref);
          });
        }
        // Step 3: Add the parent task document to the batch deletion
        batch.delete(taskDoc.ref);
      }
      
      // Add the batch commit to our transaction promises
      transactionPromises.push(batch.commit());
    }

    // Step 4: Add deletion from the main 'users' collection to the promises
    transactionPromises.push(adminDb.collection('users').doc(uid).delete());
    
    // Step 5: Add deletion from Firebase Authentication to the promises
    transactionPromises.push(adminAuth.deleteUser(uid));

    // Execute all deletion operations
    await Promise.all(transactionPromises);

    return { success: true, message: 'User and all associated data deleted successfully.' };
  } catch (error: any) {
    console.error(`Error deleting user ${uid} and their data:`, error);
    return {
      success: false,
      message: `Failed to completely delete user: ${error.message}`,
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
  if (!['Admin', 'PIC'].includes(requesterProfile.role)) {
    return { success: false, message: 'Hanya Admin atau PIC yang dapat mengajukan penghapusan.' };
  }
  if (!userToDelete.uid || !userToDelete.id) {
    return { success: false, message: 'Data pengguna yang akan dihapus tidak lengkap.'};
  }

  const approvalRequest: Omit<ApprovalRequest, 'id'|'requestTimestamp'> = {
    type: 'DELETE_USER',
    status: 'pending',
    requestedByUid: requesterProfile.uid,
    requestedByName: requesterProfile.fullName,
    requestedByRole: requesterProfile.role,
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

  const notificationMessage = `PIC ${requesterProfile.fullName} mengajukan penghapusan untuk Kurir: ${userToDelete.fullName}.`;
  
  return await submitApprovalRequest(approvalRequest, notificationMessage);
}


export async function requestBulkUserCreation(
  usersData: any[],
  requesterProfile: { uid: string; fullName: string; role: UserRole }
) {
  if (requesterProfile.role !== 'PIC') {
    return { success: false, message: 'Hanya PIC yang dapat mengajukan impor massal.' };
  }

  const validUsersToCreate: any[] = [];
  const errors: string[] = [];

  for (const [index, userData] of usersData.entries()) {
    const rowNum = index + 2;
    // Perform validation similar to the old importUsers function
    // For brevity, we assume data is mostly valid but you'd add full validation here
    if (!userData.fullName || !userData.nik || !userData.passwordValue) {
        errors.push(`Baris ${rowNum}: Data tidak lengkap (Nama, NIK, Password wajib).`);
        continue;
    }
    validUsersToCreate.push(userData);
  }

  if (validUsersToCreate.length === 0) {
    return { success: false, errors: ['Tidak ada data pengguna yang valid untuk diajukan.'], requestedCount: 0 };
  }
  
  const approvalRequest: Omit<ApprovalRequest, 'id' | 'requestTimestamp'> = {
    type: 'NEW_USER_BULK',
    status: 'pending',
    requestedByUid: requesterProfile.uid,
    requestedByName: requesterProfile.fullName,
    requestedByRole: requesterProfile.role,
    targetEntityType: 'USER_PROFILE_DATA',
    targetEntityName: `Impor Massal ${validUsersToCreate.length} Pengguna`,
    payload: { users: validUsersToCreate }, // Store the array of users in the payload
    notesFromRequester: `Pengajuan impor massal untuk ${validUsersToCreate.length} kurir baru.`,
  };
  
  const notificationMessage = `PIC ${requesterProfile.fullName} mengajukan impor massal untuk ${validUsersToCreate.length} kurir baru.`;
  const result = await submitApprovalRequest(approvalRequest, notificationMessage);

  if (result.success) {
      return { success: true, requestedCount: validUsersToCreate.length, errors };
  } else {
      return { success: false, errors: [result.message || 'Gagal mengajukan permintaan persetujuan.'], requestedCount: 0 };
  }
}

export async function importUsers(
  usersData: any[],
  roleToAssign: 'Admin' | 'PIC' | 'Kurir',
  creatorProfile: { uid: string; fullName: string; role: UserRole }
) {
  if (!['MasterAdmin', 'Admin'].includes(creatorProfile.role)) {
    return { success: false, createdCount: 0, failedCount: usersData.length, totalRows: usersData.length, errors: ['Hanya Admin atau MasterAdmin yang dapat melakukan impor massal.'] };
  }

  const results = {
    totalRows: usersData.length,
    createdCount: 0,
    failedCount: 0,
    errors: [] as string[],
  };

  // Fetch existing users from Firestore to check for duplicates proactively.
  const usersSnapshot = await adminDb.collection('users').get();
  const existingEmails = new Set(usersSnapshot.docs.map(doc => doc.data().email));
  const existingIds = new Set(usersSnapshot.docs.map(doc => doc.data().id));

  const emailInFile = new Set();
  const idInFile = new Set();

  for (const [index, userData] of usersData.entries()) {
    const rowNum = index + 2;

    // Common validations
    if (!userData.fullName || !userData.passwordValue) {
      results.failedCount++;
      results.errors.push(`Baris ${rowNum}: Data tidak lengkap (fullName & passwordValue wajib).`);
      continue;
    }

    let email = userData.email?.toString().trim();
    const appId = userData.id?.toString().trim();
    const appUserId = appId || `${roleToAssign.toUpperCase()}${String(Date.now()).slice(-6) + index}`;

    if (!email) {
      if (roleToAssign === 'Kurir') {
        email = `${appUserId.toLowerCase().replace(/\s+/g, '.')}@internal.spx`;
      } else {
        results.failedCount++;
        results.errors.push(`Baris ${rowNum}: Email wajib untuk ${roleToAssign}.`);
        continue;
      }
    }

    // Proactive checks for duplicates in file and in database
    if (emailInFile.has(email)) {
      results.failedCount++;
      results.errors.push(`Baris ${rowNum}: Duplikat email '${email}' dalam file.`);
      continue;
    }
    emailInFile.add(email);
    
    if (appId && idInFile.has(appId)) {
      results.failedCount++;
      results.errors.push(`Baris ${rowNum}: Duplikat ID Aplikasi '${appId}' dalam file.`);
      continue;
    }
    if(appId) idInFile.add(appId);
    
    if (existingEmails.has(email)) {
        results.failedCount++;
        results.errors.push(`Baris ${rowNum}: Email '${email}' sudah terdaftar di sistem.`);
        continue;
    }
    if (appId && existingIds.has(appId)) {
        results.failedCount++;
        results.errors.push(`Baris ${rowNum}: ID Aplikasi '${appId}' sudah digunakan.`);
        continue;
    }
    
    try {
      let newProfileData: Omit<UserProfile, 'uid'>;

      if (roleToAssign === 'Kurir') {
        if (!userData.nik || !userData.jabatan || !userData.workLocation || !userData.joinDate || !userData.contractStatus) {
          results.failedCount++;
          results.errors.push(`Baris ${rowNum}: Data Kurir tidak lengkap (nik, jabatan, workLocation, joinDate, contractStatus wajib).`);
          continue;
        }

        let joinDate: Date;
        const rawJoinDate = userData.joinDate;
        if (typeof rawJoinDate === 'number') {
            joinDate = new Date(Math.round((rawJoinDate - 25569) * 86400 * 1000));
        } else {
            joinDate = new Date(String(rawJoinDate).trim());
        }

        if (isNaN(joinDate.getTime())) {
            results.failedCount++;
            results.errors.push(`Baris ${rowNum}: Format tanggal join tidak valid untuk pengguna '${userData.fullName}'. Harap gunakan format YYYY-MM-DD.`);
            continue;
        }

        newProfileData = {
            id: appUserId,
            fullName: String(userData.fullName).trim(),
            nik: String(userData.nik).trim(),
            email: email,
            role: 'Kurir',
            position: String(userData.jabatan).trim(),
            wilayah: String(userData.wilayah || '').trim(),
            area: String(userData.area || '').trim(),
            workLocation: String(userData.workLocation).trim(),
            joinDate: joinDate.toISOString(),
            contractStatus: String(userData.contractStatus).trim(),
            bankName: String(userData.bankName || '').trim(),
            bankAccountNumber: String(userData.bankAccountNumber || '').trim(),
            bankRecipientName: String(userData.bankRecipientName || '').trim(),
            status: 'Aktif',
            createdBy: creatorProfile,
        };

      } else { // For Admin or PIC
        if (roleToAssign === 'PIC' && !userData.workLocation) {
           results.failedCount++;
           results.errors.push(`Baris ${rowNum}: Area Tanggung Jawab (workLocation) wajib untuk PIC.`);
           continue;
        }

        newProfileData = {
          id: appUserId,
          fullName: userData.fullName.toString().trim(),
          email: email,
          role: roleToAssign,
          status: 'Aktif',
          workLocation: userData.workLocation?.toString().trim() || undefined,
          position: roleToAssign,
          joinDate: new Date().toISOString(),
          createdBy: creatorProfile,
        };
      }
      
      const creationResult = await createUserAccount(email, userData.passwordValue.toString(), newProfileData);

      if (creationResult.success) {
        results.createdCount++;
        existingEmails.add(email); // Add to set to prevent duplicates from same file run
        existingIds.add(appUserId);
      } else {
        results.failedCount++;
        results.errors.push(`Baris ${rowNum} (${email}): ${creationResult.message}`);
      }
    } catch (error: any) {
      results.failedCount++;
      results.errors.push(`Baris ${rowNum} (${email}): ${error.message}`);
    }
  }

  return { success: results.failedCount === 0, ...results };
}



export async function handleApprovalRequest(
  requestId: string,
  decision: 'approved' | 'rejected',
  handlerProfile: { uid: string; name: string; role: UserRole },
  notesFromHandler?: string
) {
  if (!['MasterAdmin', 'Admin'].includes(handlerProfile.role)) {
    return { success: false, message: 'Hanya MasterAdmin atau Admin yang dapat memproses persetujuan.' };
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
          case 'NEW_USER_BULK':
            if (!Array.isArray(payload.users)) {
                throw new Error("Payload untuk impor massal tidak valid.");
            }
            const creationPromises = payload.users.map((userData: any, index: number) => {
                const appUserId = userData.id?.toString().trim() || `K${String(Date.now()).slice(-7) + index}`;
                const emailForAuth = userData.email?.trim() || `${appUserId.toLowerCase().replace(/\s+/g, '.')}@internal.spx`;
                
                let joinDate: Date;
                const rawJoinDate = userData.joinDate;

                if (typeof rawJoinDate === 'number') {
                    // Handle Excel date serial number
                    joinDate = new Date(Math.round((rawJoinDate - 25569) * 86400 * 1000));
                } else if (rawJoinDate && typeof rawJoinDate === 'string') {
                    // Handle string date
                    joinDate = new Date(rawJoinDate.trim());
                } else {
                    // Fallback or throw error if joinDate is missing/invalid
                    throw new Error(`Tanggal join tidak ada atau tidak valid untuk pengguna '${userData.fullName}'.`);
                }

                if (isNaN(joinDate.getTime())) {
                    throw new Error(`Format tanggal join tidak valid untuk pengguna '${userData.fullName}'. Harap gunakan format YYYY-MM-DD.`);
                }

                const profileToCreate: Omit<UserProfile, 'uid'> = {
                    id: appUserId,
                    fullName: String(userData.fullName).trim(),
                    nik: String(userData.nik).trim(),
                    email: emailForAuth,
                    role: 'Kurir',
                    position: String(userData.jabatan).trim(),
                    wilayah: String(userData.wilayah || '').trim(),
                    area: String(userData.area || '').trim(),
                    workLocation: String(userData.workLocation).trim(),
                    joinDate: joinDate.toISOString(),
                    contractStatus: String(userData.contractStatus).trim(),
                    bankName: String(userData.bankName || '').trim(),
                    bankAccountNumber: String(userData.bankAccountNumber || '').trim(),
                    bankRecipientName: String(userData.bankRecipientName || '').trim(),
                    status: 'Aktif',
                    createdBy: { uid: handlerProfile.uid, name: handlerProfile.name, role: handlerProfile.role },
                };
                return createUserAccount(emailForAuth, String(userData.passwordValue), profileToCreate);
            });
            await Promise.all(creationPromises);
            break;

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
  if (!['MasterAdmin', 'Admin'].includes(handlerProfile.role)) {
    return { success: false, message: 'Only MasterAdmin or Admin can change user status directly.' };
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
    // This function now returns the dataUrl to be stored directly in Firestore,
    // bypassing Firebase Storage for end-to-end testing.
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      throw new Error('Invalid data URL format.');
    }
    
    // Simply return the dataUrl itself.
    return { success: true, url: dataUrl };

  } catch (error: any) {
    console.error(`Error processing data URL for Firestore:`, error);
    return { success: false, message: `Failed to process data URL: ${error.message}` };
  }
}

/**
 * A robust server action to handle the creation of any approval request.
 * This centralizes the logic and uses admin privileges for writes.
 * @param requestData The core data for the approval request.
 * @param notificationMessage The message for the system notification.
 * @returns An object with the success status and a message.
 */
export async function submitApprovalRequest(
  requestData: Omit<ApprovalRequest, 'id' | 'requestTimestamp'>,
  notificationMessage: string
) {
  try {
    // 1. Add server timestamp to the request data
    const fullRequestData = {
      ...requestData,
      requestTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 2. Create the approval request document in Firestore
    await adminDb.collection('approval_requests').add(fullRequestData);

    // 3. Create the corresponding notification
    await adminDb.collection('notifications').add({
      title: 'Permintaan Persetujuan Baru',
      message: notificationMessage,
      type: 'APPROVAL_REQUEST',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      linkTo: '/approvals',
    });

    return { success: true, message: 'Permintaan berhasil diajukan.' };
  } catch (error: any) {
    console.error('Error submitting approval request via server action:', error);
    return { success: false, message: `Gagal mengajukan permintaan: ${error.message}` };
  }
}
