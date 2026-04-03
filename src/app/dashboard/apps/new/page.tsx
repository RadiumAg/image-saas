import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createAppSchema } from '@/server/db/validate-schema';
import { serverCaller } from '@/utils/trpc';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import SubmitButton from './submit-button';

export default function CreateApp() {
  const createApp = async (formData: FormData) => {
    'use server';
    const name = formData.get('name');
    const description = formData.get('description');
    const input = createAppSchema
      .pick({ name: true, description: true })
      .safeParse({ name, description });

    if (input.success) {
      const session = await getServerSession();
      const newApp = await serverCaller({ session }).apps.createApp(input.data);
      redirect(`/dashboard/apps/${newApp.id}`);
    } else {
      throw input.error;
    }
  };

  return (
    <div className="h-full flex justify-center items-center px-4">
      <form
        className="w-full max-w-md flex flex-col gap-6 p-8 bg-card rounded-2xl border shadow-sm"
        action={createApp}
      >
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">创建新应用</h1>
          <p className="text-sm text-muted-foreground">
            为你的图片资源创建一个独立的管理空间
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium leading-none">
              应用名称
            </label>
            <Input
              id="name"
              name="name"
              placeholder="输入应用名称（至少 3 个字符）"
              minLength={3}
              required
              className="transition-colors duration-200"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="description"
              className="text-sm font-medium leading-none"
            >
              描述
              <span className="text-muted-foreground font-normal ml-1">
                (可选)
              </span>
            </label>
            <Textarea
              id="description"
              name="description"
              placeholder="简要描述这个应用的用途..."
              rows={3}
              className="resize-none transition-colors duration-200"
            />
          </div>
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}
