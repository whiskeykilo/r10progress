import { CheckCircleIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import Papa from "papaparse";
import { ChangeEvent, createRef, useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiPost, apiSessionsReachable } from "../api";
import { BaseLoadingSpinner } from "../components/base/BaseLoadingSpinner";
import { BasePageLayout } from "../components/base/BasePageLayout";
import { SessionContext } from "../provider/SessionContext";
import { dashboardRoutes } from "../routes";
import type { SessionEnvironment } from "../types/Sessions";
import { assertUploadVisibleInSnapshot } from "../utils/uploadSessionVisibility";

type UploadStep = "select" | "uploading" | "success" | "error";

const CSV_ALLOWED_MIMES = new Set([
  "",
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  // Some browsers / OS combos report CSV as plain text or octet-stream
  "text/plain",
  "application/octet-stream",
]);

export const Upload = () => {
  const { fetchSnapshot, setSessions } = useContext(SessionContext);

  const formRef = createRef<HTMLFormElement>();
  const inputRef = createRef<HTMLInputElement>();

  const [step, setStep] = useState<UploadStep>("select");
  const [csvFile, setCsvFile] = useState<unknown[] | null>(null);
  const [filename, setFilename] = useState("");
  const [uploadedFilename, setUploadedFilename] = useState("");
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  /** Dev-only hint when /api is not reachable from the Vite origin */
  const [devApiHint, setDevApiHint] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<SessionEnvironment>("unknown");

  useEffect(() => {
    if (typeof import.meta === "undefined" || !import.meta.env?.DEV) return;
    if (step !== "select") return;
    let cancelled = false;
    void apiSessionsReachable().then((ok) => {
      if (cancelled || ok) {
        if (!cancelled && ok) setDevApiHint(null);
        return;
      }
      setDevApiHint(
        "Cannot reach the API at /api/sessions. If you ran `pnpm dev`, check the server log: if port 8080 is in use (EADDRINUSE), stop the other Node process and restart. Use the Vite URL from that same `pnpm dev` run.",
      );
    });
    return () => {
      cancelled = true;
    };
  }, [step]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const file = event.target.files[0];
    try {
      if (file) {
        const extOk = file.name.toLowerCase().endsWith(".csv");
        const mimeOk = CSV_ALLOWED_MIMES.has(file.type);
        if (!extOk || !mimeOk) {
          throw new Error("Please upload a valid CSV file.");
        }
        setCsvFile(null);
        setFilename(file.name);
        setError("");
        setIsParsing(true);
        const reader = new FileReader();
        reader.onload = (e) => {
          if (!e.target) return;
          const csvData = e.target.result;
          if (!csvData) {
            setIsParsing(false);
            return;
          }
          // @ts-expect-error - PapaParse typings are incorrect
          Papa.parse(csvData, {
            header: true,
            dynamicTyping: true,
            complete: (results) => {
              setCsvFile(results.data);
              setIsParsing(false);
            },
            error: () => {
              setError("Could not parse this CSV file.");
              setIsParsing(false);
            },
          });
        };
        reader.onerror = () => {
          setError("Could not read this CSV file.");
          setIsParsing(false);
        };
        reader.readAsText(file);
      }
    } catch {
      setError("Please upload a valid CSV file.");
      setIsParsing(false);
    }
  };

  const handleUpload = async () => {
    if (isParsing) {
      setError(
        "Still processing CSV file. Please wait a moment and try again.",
      );
      return;
    }
    if (!csvFile) {
      setError("Please choose a CSV file first.");
      return;
    }
    setStep("uploading");
    try {
      await apiPost(`/api/sessions/${encodeURIComponent(filename)}`, {
        results: csvFile,
        environment,
      });

      const updatedSessions = await fetchSnapshot();
      assertUploadVisibleInSnapshot(filename, updatedSessions);

      const newSessions = { ...updatedSessions };
      newSessions[filename] = {
        ...newSessions[filename],
        selected: true,
      };
      setSessions(newSessions);

      if (typeof window !== "undefined" && window.plausible) {
        window.plausible?.("Upload CSV");
      }

      setUploadedFilename(filename);
      setStep("success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
      setStep("error");
    }
  };

  const resetForm = () => {
    setCsvFile(null);
    setFilename("");
    setError("");
    setIsParsing(false);
    setDevApiHint(null);
    formRef.current?.reset();
    setStep("select");
  };

  return (
    <BasePageLayout title="Upload">
      {step === "select" && (
        <form
          ref={formRef}
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleUpload();
          }}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-base">
              Upload your CSV file exported from the Garmin Golf App.
            </p>
            <a
              href="https://support.garmin.com/en-US/?faq=pit4ClEw6f019Cbs3Uhw59"
              target="_blank"
              rel="noreferrer"
              className="w-fit text-sm italic text-blue-600 underline hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Need help? Follow Garmin&apos;s CSV export instructions.
            </a>
          </div>
          <p className="text-sm text-yellow-600">
            <b>Warning:</b> This app requires consistent localization between
            exports. Otherwise, your clubs will not be recognized across
            sessions.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Uploading the same file name again <b>replaces</b> that session in
            the database.
          </p>
          <fieldset className="rounded-lg border border-gray-200 p-3 dark:border-gray-600">
            <legend className="px-1 text-sm font-medium text-gray-900 dark:text-white">
              Session environment
            </legend>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              R10 modeled metrics (carry, spin, path) are interpreted more
              cautiously indoors. Pick what matches where you hit these shots.
            </p>
            <div className="flex flex-wrap gap-4">
              {(
                [
                  ["outdoor", "Outdoor / range (open)"],
                  ["indoor", "Indoor / simulator"],
                  ["unknown", "Not sure"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="radio"
                    name="session-environment"
                    value={value}
                    checked={environment === value}
                    onChange={() => setEnvironment(value)}
                    className="app-focus-ring h-4 w-4 shrink-0 border-gray-300 text-brand-600 dark:border-gray-500 dark:bg-gray-800 dark:text-brand-500 dark:focus-visible:ring-offset-gray-800"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {devApiHint && (
            <p
              role="alert"
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
            >
              {devApiHint}
            </p>
          )}

          <div className="flex flex-col">
            <label
              className="text-sm text-gray-500 dark:text-gray-400"
              htmlFor="file"
            >
              Select CSV file
            </label>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <input
                ref={inputRef}
                type="file"
                id="file"
                accept=".csv"
                className="btn w-fit self-start"
                onChange={handleFileChange}
              />
              <button
                className={clsx(
                  "btn",
                  (isParsing ||
                    csvFile === null ||
                    inputRef.current?.value === "") &&
                    "is-disabled",
                )}
                type="submit"
                disabled={
                  isParsing ||
                  csvFile === null ||
                  inputRef.current?.value === ""
                }
              >
                {isParsing ? "Processing..." : "Upload"}
              </button>
            </div>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        </form>
      )}

      {step === "uploading" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <BaseLoadingSpinner />
          <p className="text-base text-gray-600 dark:text-gray-300">
            Uploading {filename}…
          </p>
        </div>
      )}

      {step === "success" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <CheckCircleIcon className="h-16 w-16 text-green-500" />
          <h3 className="text-xl font-semibold text-green-700">
            Upload Successful!
          </h3>
          <p className="text-base text-gray-600 dark:text-gray-300">
            Session &ldquo;{uploadedFilename}&rdquo; has been uploaded and
            selected.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to={dashboardRoutes.sessions} className="btn">
              View sessions &amp; data
            </Link>
            <button
              onClick={resetForm}
              type="button"
              className="btn btn-secondary"
            >
              Upload another
            </button>
          </div>
        </div>
      )}

      {step === "error" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="text-base text-red-600">{error}</p>
          <button onClick={resetForm} className="btn">
            Try Again
          </button>
        </div>
      )}
    </BasePageLayout>
  );
};
