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
    <div className="h-full flex justify-center items-center">
      <form className="w-full max-w-md flex flex-col gap-4" action={createApp}>
        <h1 className="text-center text-xl font-bold">Create App</h1>
        <Input
          name="name"
          placeholder="App Name"
          minLength={3}
          required
         />
        <Textarea name="description" placeholder="Description" />
        <SubmitButton />
      </form>
    </div>
  );
}
