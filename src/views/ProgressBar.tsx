export const ProgressBar = ({ progress }: { progress: number }) => {
  return (
    <div className="relative pt-1">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <span className="inline-block rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white dark:bg-blue-500">
            {progress.toFixed(2)}%
          </span>
        </div>
        <div className="text-right">
          <span className="inline-block text-xs font-semibold text-blue-600 dark:text-blue-400">
            100%
          </span>
        </div>
      </div>
      <div className="mb-4 flex h-2 overflow-hidden rounded bg-blue-200 text-xs dark:bg-gray-700">
        <div
          style={{ width: `${progress}%` }}
          className="flex flex-col justify-center whitespace-nowrap bg-blue-500 text-center text-white shadow-none dark:bg-blue-400"
        ></div>
      </div>
    </div>
  );
};
