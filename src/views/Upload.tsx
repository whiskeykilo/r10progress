import { CheckCircleIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import Papa from "papaparse";
import { ChangeEvent, createRef, useContext, useState } from "react";
import { Link } from "react-router-dom";
import { apiPost } from "../api";
import { BaseLoadingSpinner } from "../components/base/BaseLoadingSpinner";
import { BasePageLayout } from "../components/base/BasePageLayout";
import { SessionContext } from "../provider/SessionContext";
import { dashboardRoutes } from "../routes";

type UploadStep = "select" | "uploading" | "success" | "error";

export const Upload = () => {
  const { fetchSnapshot, setSessions } = useContext(SessionContext);

  const formRef = createRef<HTMLFormElement>();
  const inputRef = createRef<HTMLInputElement>();

  const [step, setStep] = useState<UploadStep>("select");
  const [csvFile, setCsvFile] = useState<unknown[] | null>(null);
  const [filename, setFilename] = useState("");
  const [uploadedFilename, setUploadedFilename] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const file = event.target.files[0];
    try {
      if (file) {
        if (file.type !== "text/csv" || !file.name.endsWith(".csv"))
          throw new Error("Please upload a valid CSV file.");
        setFilename(file.name);
        setError("");
        const reader = new FileReader();
        reader.onload = (e) => {
          if (!e.target) return;
          const csvData = e.target.result;
          if (!csvData) return;
          // @ts-expect-error - PapaParse typings are incorrect
          Papa.parse(csvData, {
            header: true,
            dynamicTyping: true,
            complete: (results) => setCsvFile(results.data),
          });
        };
        reader.readAsText(file);
      }
    } catch {
      setError("Please upload a valid CSV file.");
    }
  };

  const handleUpload = async () => {
    if (!csvFile) return;
    setStep("uploading");
    try {
      const results = [...csvFile];
      results.shift();
      await apiPost(`/api/sessions/${encodeURIComponent(filename)}`, {
        results,
      });

      const updatedSessions = await fetchSnapshot();
      if (updatedSessions && filename in updatedSessions) {
        const newSessions = { ...updatedSessions };
        newSessions[filename] = { ...newSessions[filename], selected: true };
        setSessions(newSessions);
      }

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
    formRef.current?.reset();
    setStep("select");
  };

  return (
    <BasePageLayout>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Upload Session
      </h1>

      {step === "select" && (
        <form
          ref={formRef}
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleUpload();
          }}
        >
          <p className="text-base">
            Upload your CSV file exported from the Garmin Golf App.
          </p>
          <p className="text-sm text-yellow-600">
            <b>Warning:</b> This app requires consistent localization between
            exports. Otherwise, your clubs will not be recognized across
            sessions.
          </p>

          <div className="flex flex-col">
            <label
              className="text-sm text-gray-500 dark:text-gray-400"
              htmlFor="file"
            >
              Select CSV file
            </label>
            <input
              ref={inputRef}
              type="file"
              id="file"
              accept=".csv"
              className="btn"
              onChange={handleFileChange}
            />
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>

          <button
            className={clsx(
              "btn self-end",
              (csvFile === null || inputRef.current?.value === "") &&
                "is-disabled",
            )}
            type="submit"
          >
            Upload
          </button>
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
          <div className="flex gap-4">
            <button onClick={resetForm} className="btn btn-secondary">
              Upload Another
            </button>
            <Link to={dashboardRoutes.sessions} className="btn">
              View Sessions
            </Link>
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
