import { useContext, useEffect, useMemo, useState } from "react";
import { SessionContext } from "../../provider/SessionContext";
import {
  GolfSwingData,
  nonNumericGolfSwingDataKeys,
} from "../../types/GolfSwingData";
import { useAveragePerSession } from "../../utils/calculateAverages";
import { getAllDataFromSession } from "../../utils/getAllDataFromSession";
import { getPairsForYfield } from "../../utils/utils";
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
    if (!sessions) return [];

    const allData = getAllDataFromSession(sessions);
    if (allData.length === 0) return [];

    const allKeys = new Set<string>();
    allData.forEach((row) => {
      Object.keys(row).forEach((key) => allKeys.add(key));
    });

    return Array.from(allKeys)
      .filter(
        (field) =>
          !nonNumericGolfSwingDataKeys.includes(field as keyof GolfSwingData),
      )
      .filter((field) =>
        allData.some((row) => {
          const value = row[field as keyof GolfSwingData];
          return typeof value === "number" && Number.isFinite(value);
        }),
      )
      .sort((a, b) => a.localeCompare(b));
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
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h4 className="text-xl font-bold text-gray-800 dark:text-gray-100">
          Averages
        </h4>
        <div className="w-full sm:max-w-56">
          <BaseListbox
            options={fields}
            setOption={setYField as (option: string) => void}
            value={yField}
            valueText={yField as string}
            ariaLabel="Select metric for averages chart"
          />
        </div>
      </div>
      <div className="block h-[460px] w-full">
        <AverageMetricsGraph metric={yField} data={data} />
      </div>
    </div>
  );
};
