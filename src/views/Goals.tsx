import { useState } from "react";
import { BaseDialog } from "../components/base/BaseDialog";
import { BasePageLayout } from "../components/base/BasePageLayout";
import { GoalForm } from "./GoalForm";
import { GoalList } from "./GoalList";

export const Goals = () => {
  return (
    <BasePageLayout title="Goals">
      <GoalList />
      <GoalDialog />
    </BasePageLayout>
  );
};

const GoalDialog = () => {
  const [showDialog, setShowDialog] = useState(false);
  return (
    <>
      <button onClick={() => setShowDialog(true)} className="btn mt-4">
        Add new goal
      </button>

      <BaseDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        title="Add a new goal"
      >
        <GoalForm closeAction={() => setShowDialog(false)} />
      </BaseDialog>
    </>
  );
};
