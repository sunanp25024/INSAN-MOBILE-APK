
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';

export default function ApprovalsPage() {
  // TODO: Fetch current user role and verify access (MasterAdmin)
  // For now, assume access is granted if page is reached

  // Mock data for example
  const mockApprovalRequests = [
    {
      id: 'APP001',
      type: 'Perubahan Data Kurir',
      details: {
        kurirId: 'PISTEST2025',
        fieldChanged: 'Nomor Telepon',
        oldValue: '081200002025',
        newValue: '081311112222',
      },
      requestedBy: 'Admin001 (Admin Staff)',
      requestDate: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    },
    {
      id: 'APP002',
      type: 'Penambahan PIC Baru',
      details: {
        picName: 'Rina Sugiarto',
        picEmail: 'rina.s@example.com',
        picArea: 'Jakarta Selatan',
      },
      requestedBy: 'Admin002 (Admin Staff Dua)',
      requestDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
    {
      id: 'APP003',
      type: 'Nonaktifkan Akun Kurir',
      details: {
        kurirId: 'KURIR003',
        kurirName: 'Charlie Van Houten',
        reason: 'Permintaan pengunduran diri',
      },
      requestedBy: 'Admin001 (Admin Staff)',
      requestDate: new Date().toISOString(),
    }
  ];


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-primary">
            <ShieldCheck className="mr-3 h-7 w-7" />
            Persetujuan Perubahan Data
          </CardTitle>
          <CardDescription>
            Tinjau dan setujui atau tolak permintaan perubahan data yang diajukan oleh Admin atau PIC.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mockApprovalRequests.length > 0 ? (
            <div className="space-y-4">
              {mockApprovalRequests.map((req) => (
                <Card key={req.id} className="bg-card-foreground/5 p-4">
                  <h3 className="text-md font-semibold text-foreground mb-1">
                    {req.type} - ID: {req.id}
                  </h3>
                  <div className="text-sm space-y-0.5">
                    <p><strong>Diajukan oleh:</strong> {req.requestedBy}</p>
                    <p><strong>Tanggal Diajukan:</strong> {new Date(req.requestDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    {req.type === 'Perubahan Data Kurir' && req.details.kurirId && (
                      <>
                        <p><strong>Kurir ID:</strong> {req.details.kurirId}</p>
                        <p><strong>Perubahan:</strong> {req.details.fieldChanged} dari <span className="line-through text-muted-foreground">{req.details.oldValue}</span> menjadi <span className="text-green-500">{req.details.newValue}</span></p>
                      </>
                    )}
                    {req.type === 'Penambahan PIC Baru' && req.details.picName && (
                      <>
                        <p><strong>Nama PIC:</strong> {req.details.picName}</p>
                        <p><strong>Email:</strong> {req.details.picEmail}</p>
                        <p><strong>Area:</strong> {req.details.picArea}</p>
                      </>
                    )}
                     {req.type === 'Nonaktifkan Akun Kurir' && req.details.kurirId && (
                      <>
                        <p><strong>Kurir ID:</strong> {req.details.kurirId} ({req.details.kurirName})</p>
                        <p><strong>Alasan:</strong> {req.details.reason}</p>
                      </>
                    )}
                  </div>
                  <div className="mt-3 space-x-2">
                    <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" disabled>Setujui</Button>
                    <Button size="sm" variant="destructive" disabled>Tolak</Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-lg text-muted-foreground">Tidak ada permintaan persetujuan saat ini.</p>
              <p className="text-sm text-muted-foreground">Semua permintaan telah diproses atau belum ada yang masuk.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
