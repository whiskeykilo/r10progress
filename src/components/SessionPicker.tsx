import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { Fragment, useCallback, useContext, useEffect, useMemo } from "react";
import { SessionContext } from "../provider/SessionContext";
import { Sessions } from "../types/Sessions";

export const SessionPicker = () => {
  const { sessions, setSessions, fetchSnapshot, initialized, isLoading } =
    useContext(SessionContext);

  // Derive selected sessions from the sessions object
  const selected = useMemo(() => {
    if (!sessions) return [];

    const selectedKeys = Object.keys(sessions).filter(
      (key) => sessions[key].selected,
    );

    // If all sessions are selected, include the "All" option
    const allSessionsSelected =
      selectedKeys.length === Object.keys(sessions).length &&
      Object.keys(sessions).length > 0;

    return allSessionsSelected ? [...selectedKeys, "All"] : selectedKeys;
  }, [sessions]);

  // Handle initial data loading
  useEffect(() => {
    if (!initialized) {
      fetchSnapshot();
    }
  }, [fetchSnapshot, initialized]);

  // Memoize session keys for performance
  const sessionKeys = useMemo(
    () => (sessions ? Object.keys(sessions) : []),
    [sessions],
  );

  // Helper function to create updated sessions with a specific selection state
  const createUpdatedSessions = useCallback(
    (selectAll: boolean, specificSelections?: string[]) => {
      if (!sessions) return {} as Sessions;

      return sessionKeys.reduce((acc, key) => {
        // If specificSelections is provided, use it to determine selection
        // Otherwise use the selectAll parameter for all sessions
        const isSelected = specificSelections
          ? specificSelections.includes(key)
          : selectAll;

        acc[key] = { ...sessions[key], selected: isSelected };
        return acc;
      }, {} as Sessions);
    },
    [sessions, sessionKeys],
  );

  // Handle selection changes with useCallback
  const handleSelectionChange = useCallback(
    (value: string[]) => {
      if (!sessions) return;

      // Check if "All" was just selected
      const allJustSelected =
        value.includes("All") && !selected.includes("All");

      // Check if "All" was just deselected
      const allJustDeselected =
        !value.includes("All") && selected.includes("All");

      let updatedSessions: Sessions;

      if (allJustSelected) {
        // Select all sessions
        updatedSessions = createUpdatedSessions(true);
      } else if (allJustDeselected) {
        // Deselect all sessions
        updatedSessions = createUpdatedSessions(false);
      } else {
        // Handle individual session selection
        const filteredValue = value.filter((v) => v !== "All");
        updatedSessions = createUpdatedSessions(false, filteredValue);
      }

      setSessions(updatedSessions);
    },
    [sessions, selected, createUpdatedSessions, setSessions],
  );

  // Display text for the selection button
  const selectionDisplayText = useMemo(() => {
    if (selected.length === 0) return "None";
    if (selected.includes("All")) return "All sessions";
    if (selected.length === 1) {
      const key = selected[0];
      return sessions[key]?.displayName ?? key;
    }
    return `${selected.length} sessions`;
  }, [selected, sessions]);

  // Size the picker based on the longest available session name.
  const pickerWidthCh = useMemo(() => {
    const longestLabelLength = sessionKeys.reduce((maxLength, key) => {
      const labelLength = (sessions[key]?.displayName ?? key).length;
      return Math.max(maxLength, labelLength);
    }, "All sessions".length);

    // Add room for horizontal padding and the chevron icon.
    return Math.min(Math.max(longestLabelLength + 6, 18), 56);
  }, [sessionKeys, sessions]);

  if (!sessions) {
    return <div className="flex items-center">Loading sessions...</div>;
  }

  return (
    <div className="flex items-center" aria-live="polite" aria-busy={isLoading}>
      <Listbox multiple value={selected} onChange={handleSelectionChange}>
        <div
          className="relative z-20 max-w-full"
          style={{ width: `min(calc(100vw - 2rem), ${pickerWidthCh}ch)` }}
        >
          <Listbox.Label className="sr-only">Session Selection</Listbox.Label>
          <Listbox.Button
            aria-label="Select sessions to include in analysis"
            title="Select a session to filter data in the table and averages."
            className={`app-focus-ring relative w-full cursor-pointer rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-10 text-left text-sm text-gray-900 shadow-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 sm:text-sm ${isLoading ? "opacity-50" : ""}`}
          >
            <span className="block truncate">
              {isLoading ? "Loading…" : selectionDisplayText}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-500 dark:text-gray-300"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:ring-white/10 sm:text-sm">
              <Listbox.Option
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active
                      ? "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200"
                      : "text-gray-900 dark:text-gray-100"
                  }`
                }
                value="All"
              >
                {({ selected }) => (
                  <>
                    <span
                      className={`block truncate ${
                        selected ? "font-medium" : "font-normal"
                      }`}
                    >
                      All
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sky-600 dark:text-sky-400">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
              {sessionKeys.map((sessionKey) => (
                <Listbox.Option
                  key={sessionKey}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      active
                        ? "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200"
                        : "text-gray-900 dark:text-gray-100"
                    }`
                  }
                  value={sessionKey}
                >
                  {({ selected }) => (
                    <>
                      <span
                        className={`block truncate ${
                          selected ? "font-medium" : "font-normal"
                        }`}
                      >
                        {sessions[sessionKey]?.displayName ?? sessionKey}
                      </span>
                      {selected ? (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sky-600 dark:text-sky-400">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
};
