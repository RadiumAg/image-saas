import { DialogContent } from '@/components/ui/dialog';
import CreateApp from '@/app/dashboard/apps/new/page';
import { DialogTitle } from '@radix-ui/react-dialog';
import BackableDialog from './backable-dialog';

export default function InterceptingCreateApp() {
  return (
    <BackableDialog>
      <DialogTitle />
      <DialogContent>
        <CreateApp />
      </DialogContent>
    </BackableDialog>
  );
}
