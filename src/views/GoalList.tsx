import { useGoals } from "../hooks/useGoals";
import { Goal } from "./Goal";

export const GoalList = () => {
  const goals = useGoals();

  return (
    <div className="mt-4">
      <h2 className="text-xl font-semibold dark:text-white">Your goals</h2>
      {goals.map((goal) => (
        <Goal key={goal.id} goal={goal} />
      ))}
    </div>
  );
};
