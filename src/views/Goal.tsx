import type { Goal as GoalType } from "../types/Goals";
import { useState } from "react";
import { ProgressBar } from "./ProgressBar";

type GoalProps = {
  goal: GoalType;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: { title: string; target: number }) => void;
};

export const Goal = ({ goal, onDelete, onUpdate }: GoalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(goal.title);
  const [draftTarget, setDraftTarget] = useState(goal.target.toString());

  const handleSave = () => {
    const parsedTarget = Number(draftTarget);
    if (
      !draftTitle.trim() ||
      !Number.isFinite(parsedTarget) ||
      parsedTarget <= 0
    ) {
      return;
    }
    onUpdate(goal.id, { title: draftTitle.trim(), target: parsedTarget });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraftTitle(goal.title);
    setDraftTarget(goal.target.toString());
    setIsEditing(false);
  };

  const formattedCurrent =
    goal.current === null || goal.current === undefined
      ? "N/A"
      : Number.isFinite(Number(goal.current))
        ? `${Number(goal.current).toFixed(1)}${goal.unit}`
        : "N/A";

  return (
    <div className="mt-2 max-w-2xl rounded-md bg-white p-4 dark:bg-gray-800 dark:text-white">
      {isEditing ? (
        <input
          type="text"
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          className="input w-full"
          aria-label="Goal title"
        />
      ) : (
        <h3 className="text-lg font-semibold">{goal.title}</h3>
      )}
      <hr />
      <div className="flex flex-col justify-between text-lg lg:flex-row">
        <p>
          Current: <b>{formattedCurrent}</b>
        </p>
        <p>
          Target:{" "}
          {isEditing ? (
            <input
              type="number"
              value={draftTarget}
              onChange={(e) => setDraftTarget(e.target.value)}
              className="input inline-block w-28"
              aria-label="Goal target"
            />
          ) : (
            <b>{goal.target + goal.unit}</b>
          )}
        </p>
        <p>
          Progress: <b>{goal.progressText}</b>
        </p>
        <p>
          Direction:{" "}
          <b>
            {goal.direction === "increase"
              ? "Higher is better"
              : "Lower is better"}
          </b>
        </p>
      </div>
      <ProgressBar progress={goal.progress} />
      <div className="mt-4 flex justify-end gap-2">
        {isEditing ? (
          <>
            <button type="button" className="btn" onClick={handleSave}>
              Save
            </button>
            <button type="button" className="btn" onClick={handleCancel}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => onDelete(goal.id)}
              aria-label={`Delete goal ${goal.title}`}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
};
