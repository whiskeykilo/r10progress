import { useAtom } from "jotai";
import { goalAtom } from "../hooks/useGoals";
import { useGoals } from "../hooks/useGoals";
import { Goal } from "./Goal";

export const GoalList = () => {
  const [, setGoals] = useAtom(goalAtom);
  const goals = useGoals();

  return (
    <div className="mt-4">
      <h2 className="text-xl font-semibold dark:text-white">Your goals</h2>
      {goals.map((goal) => (
        <Goal
          key={goal.id}
          goal={goal}
          onDelete={(id) => {
            setGoals((previousGoals) =>
              previousGoals.filter((previousGoal) => previousGoal.id !== id),
            );
          }}
          onUpdate={(id, updates) => {
            setGoals((previousGoals) =>
              previousGoals.map((previousGoal) =>
                previousGoal.id === id
                  ? { ...previousGoal, ...updates }
                  : previousGoal,
              ),
            );
          }}
        />
      ))}
    </div>
  );
};
