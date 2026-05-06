import { useContext, useEffect, useMemo, useState } from "react";
import { SessionContext } from "../../provider/SessionContext";
import { GolfSwingData } from "../../types/GolfSwingData";
import { useAveragePerSession } from "../../utils/calculateAverages";
import { getPairsForYfield } from "../../utils/utils";
import { BaseLabel } from "../base/BaseLabel";
import { BaseListbox } from "../base/BaseListbox";
import { AverageMetricsGraph } from "./graphs/AverageMetricsGraph";

export type YFieldValue = string | number | null | undefined;
export type ClubDataForTable = {
  x: string | null | undefined;
  y: YFieldValue;
  club: string;
}[];

export const AveragesPerSession = () => {
  const averages = useAveragePerSession();
  const [yField, setYField] = useState<keyof GolfSwingData>("Carry Distance");

  const { sessions } = useContext(SessionContext);

  const fields = useMemo(() => {
    if (sessions) {
      return Object.keys(sessions).length > 0
        ? Object.keys(sessions[Object.keys(sessions)[0]]?.results?.[0])
        : [];
    }
    return [];
  }, [sessions]);

  useEffect(() => {
    if (fields.length > 0) {
      if (fields.includes("Carry Distance")) {
        setYField("Carry Distance" as keyof GolfSwingData);
      } else {
        setYField(fields[0] as keyof GolfSwingData);
      }
    }
  }, [fields]);

  const data: ClubDataForTable = useMemo(() => {
    if (!sessions) return [];
    return getPairsForYfield(averages, yField);
  }, [sessions, averages, yField]);

  return (
    <div className="flex h-auto w-full flex-col gap-3 rounded-xl bg-white p-4 dark:bg-gray-800">
      <h4 className="mb-4 text-xl font-bold text-gray-800 dark:text-gray-100">
        Averages per Session
      </h4>
      <div className="relative block h-[600px] w-full">
        <div className="absolute right-2 top-2 z-10 w-full max-w-56 rounded-md bg-white/90 p-2 shadow-sm backdrop-blur-sm dark:bg-gray-800/90">
          <BaseLabel>Choose the fields to display</BaseLabel>
          <BaseListbox
            options={fields}
            setOption={setYField as (option: string) => void}
            value={yField}
            valueText={yField as string}
          />
        </div>
        <AverageMetricsGraph metric={yField} data={data} />
      </div>
    </div>
  );
};
