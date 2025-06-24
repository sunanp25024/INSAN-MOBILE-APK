
'use server';

import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import type { UserProfile, UserRole } from '@/types';

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

    let emailForAuth: string;
    let appUserId: string;
    let profileToCreate: Omit<UserProfile, 'uid'>;

    try {
      switch (role) {
        case 'Admin':
          const requiredAdminFields = {
            fullName: 'Nama Lengkap',
            email: 'Email',
            passwordValue: 'Password'
          };
          const missingAdminFields = Object.entries(requiredAdminFields)
            .filter(([key]) => !userData[key])
            .map(([, value]) => value);

          if (missingAdminFields.length > 0) {
            failedCount++;
            errors.push(`Baris ${rowNum}: Kolom berikut wajib diisi: ${missingAdminFields.join(', ')}.`);
            continue;
          }

          emailForAuth = userData.email.trim();
          appUserId = userData.id?.toString().trim() || `ADMIN${String(Date.now()).slice(-6) + index}`;
          profileToCreate = {
            id: appUserId,
            fullName: userData.fullName,
            email: emailForAuth,
            role: 'Admin',
            status: 'Aktif',
            joinDate: new Date().toISOString(),
            createdBy: creatorProfile,
          };
          break;

        case 'PIC':
          const requiredPicFields = {
            fullName: 'Nama Lengkap',
            email: 'Email',
            passwordValue: 'Password',
            workLocation: 'Area Tanggung Jawab'
          };
           const missingPicFields = Object.entries(requiredPicFields)
            .filter(([key]) => !userData[key])
            .map(([, value]) => value);

          if (missingPicFields.length > 0) {
            failedCount++;
            errors.push(`Baris ${rowNum}: Kolom berikut wajib diisi: ${missingPicFields.join(', ')}.`);
            continue;
          }

          emailForAuth = userData.email.trim();
          appUserId = userData.id?.toString().trim() || `PIC${String(Date.now()).slice(-6) + index}`;
          profileToCreate = {
            id: appUserId,
            fullName: userData.fullName,
            email: emailForAuth,
            role: 'PIC',
            status: 'Aktif',
            workLocation: userData.workLocation,
            joinDate: new Date().toISOString(),
            createdBy: creatorProfile,
          };
          break;

        case 'Kurir':
          const requiredKurirFields = {
            fullName: 'Nama Lengkap',
            nik: 'NIK',
            passwordValue: 'Password',
            jabatan: 'Jabatan',
            wilayah: 'Wilayah',
            area: 'Area',
            workLocation: 'Lokasi Kerja (Hub)',
            joinDate: 'Tanggal Join',
            contractStatus: 'Status Kontrak',
          };
          
          const missingKurirFields = Object.entries(requiredKurirFields)
            .filter(([key]) => !userData[key])
            .map(([, value]) => value);

          if (missingKurirFields.length > 0) {
            failedCount++;
            errors.push(`Baris ${rowNum}: Kolom berikut wajib diisi: ${missingKurirFields.join(', ')}.`);
            continue;
          }

          appUserId = userData.id?.toString().trim() || `K${String(Date.now()).slice(-7) + index}`;
          emailForAuth = userData.email?.trim() || `${appUserId.toLowerCase().replace(/\s+/g, '.')}@internal.spx`;
          
          let joinDate: Date;
          if (typeof userData.joinDate === 'number') {
             joinDate = new Date(Math.round((userData.joinDate - 25569) * 86400 * 1000));
          } else {
             joinDate = new Date(userData.joinDate);
          }

          if (isNaN(joinDate.getTime())) {
             failedCount++;
             errors.push(`Baris ${rowNum}: Format Tanggal Join tidak valid. Gunakan YYYY-MM-DD.`);
             continue;
          }

          profileToCreate = {
            id: appUserId,
            fullName: userData.fullName,
            nik: String(userData.nik),
            email: emailForAuth,
            role: 'Kurir',
            position: userData.jabatan,
            wilayah: userData.wilayah,
            area: userData.area,
            workLocation: userData.workLocation,
            joinDate: joinDate.toISOString(),
            contractStatus: userData.contractStatus,
            bankName: userData.bankName || '',
            bankAccountNumber: String(userData.bankAccountNumber || ''),
            bankRecipientName: userData.bankRecipientName || '',
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
    success: createdCount > 0,
    createdCount,
    failedCount,
    totalRows: usersData.length,
    errors,
  };
}
