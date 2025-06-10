
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MailCheck, CheckCircle, XCircle, AlertCircle, Hourglass } from 'lucide-react';

interface ApprovalRequest {
  id: string;
  type: 'Perubahan Data Kurir' | 'Penambahan PIC Baru' | 'Penambahan Kurir Baru' | 'Perubahan Status PIC';
  summary: string;
  requestDate: string;
  status: 'Menunggu Persetujuan' | 'Disetujui' | 'Ditolak';
  notes?: string; // Notes from MasterAdmin
}

// Mock data for example requests
const mockPendingApprovals: ApprovalRequest[] = [
  {
    id: 'REQ001',
    type: 'Perubahan Data Kurir',
    summary: "Kurir ID PISTEST2025: Ubah No. Telp dari 0812xxxx ke 0813yyyy",
    requestDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    status: 'Menunggu Persetujuan',
  },
  {
    id: 'REQ002',
    type: 'Penambahan PIC Baru',
    summary: "PIC Citra Dewi, Area: Jakarta Barat",
    requestDate: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    status: 'Disetujui',
    notes: 'Profil PIC telah aktif.',
  },
  {
    id: 'REQ003',
    type: 'Penambahan Kurir Baru',
    summary: "Kurir Ahmad Subagja, NIK: 1234567890123456, Hub: Bandung Utara",
    requestDate: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
    status: 'Ditolak',
    notes: 'Data NIK tidak valid, harap periksa kembali.',
  },
  {
    id: 'REQ004',
    type: 'Perubahan Status PIC',
    summary: "PIC ID PIC002: Ubah status menjadi Nonaktif",
    requestDate: new Date().toISOString(),
    status: 'Menunggu Persetujuan',
  }
];

const StatusIcon = ({ status }: { status: ApprovalRequest['status'] }) => {
  switch (status) {
    case 'Menunggu Persetujuan':
      return <Hourglass className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" />;
    case 'Disetujui':
      return <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />;
    case 'Ditolak':
      return <XCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />;
    default:
      return <AlertCircle className="h-5 w-5 text-muted-foreground mr-2 flex-shrink-0" />;
  }
};


export default function PendingApprovalsPage() {
  // TODO: Fetch current user role and verify access (Admin)
  // For now, assume access is granted if page is reached

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-primary">
            <MailCheck className="mr-3 h-7 w-7" />
            Status Persetujuan Saya
          </CardTitle>
          <CardDescription>
            Lihat status permintaan perubahan data yang telah Anda ajukan kepada MasterAdmin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mockPendingApprovals.length > 0 ? (
            <div className="space-y-4">
              {mockPendingApprovals.map((req) => (
                <Card key={req.id} className="p-4 bg-card-foreground/5">
                  <div className="flex items-start">
                    <StatusIcon status={req.status} />
                    <div className="flex-grow">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-1">
                        <h3 className="text-md font-semibold text-foreground">
                          {req.type} - ID: {req.id}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${req.status === 'Menunggu Persetujuan' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            req.status === 'Disetujui' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{req.summary}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Diajukan pada: {new Date(req.requestDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {req.notes && (
                        <p className="text-xs text-primary italic mt-1">Catatan MasterAdmin: {req.notes}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
             <div className="text-center py-8">
              <MailCheck className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-lg text-muted-foreground">Belum ada permintaan yang diajukan.</p>
              <p className="text-sm text-muted-foreground">Semua permintaan persetujuan Anda akan muncul di sini.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
