import { db } from '@/server/db/db';
import { notFound } from 'next/navigation';
import Image from 'next/image';

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const file = await db.query.files.findFirst({
    where: (files, { eq }) => eq(files.id, id),
    with: {
      app: {
        with: {
          storage: true,
        },
      },
    },
  });

  if (!file || !file.app || Array.isArray(file.app) || !file.app.storage) {
    notFound();
  }

  const imageUrl = `/image/${id}`;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-7xl w-full">
        <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
          <div className="relative w-full" style={{ aspectRatio: 'auto' }}>
            <Image
              src={imageUrl}
              alt={file.name}
              width={1920}
              height={1080}
              className="w-full h-auto"
              priority
            />
          </div>
          <div className="p-6 bg-white">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {file.name}
            </h1>
            <p className="text-sm text-gray-500">
              上传时间:{' '}
              {file.createdAt
                ? new Date(file.createdAt).toLocaleString('zh-CN')
                : '未知'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
