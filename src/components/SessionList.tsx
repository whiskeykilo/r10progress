import { Dialog, Transition } from "@headlessui/react";
import { TrashIcon } from "@heroicons/react/20/solid";
import {
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SessionContext } from "../provider/SessionContext";
import { dashboardRoutes } from "../routes";
import type { SessionEnvironment } from "../types/Sessions";

// This list allows the users to see all the sessions that are available to them.
// They can see the recorded date, the amount of shots and have an option to delete the session.
export const SessionList = () => {
  const {
    sessions,
    deleteSession: _deleteSession,
    regenerateSessionName,
    updateSessionMetadata,
  } = useContext(SessionContext);

  const [open, setOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [renamingSession, setRenamingSession] = useState<string | null>(null);
  const [renameCooldownSession, setRenameCooldownSession] = useState<
    string | null
  >(null);
  const [draftMeta, setDraftMeta] = useState<
    Record<string, { notes: string; environment: SessionEnvironment }>
  >({});
  const [savingMetaSession, setSavingMetaSession] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setDraftMeta((prev) => {
      const next = { ...prev };
      Object.entries(sessions).forEach(([id, session]) => {
        if (!next[id]) {
          next[id] = {
            notes: session.notes ?? "",
            environment: session.environment ?? "unknown",
          };
        }
      });
      return next;
    });
  }, [sessions]);

  const showDeletionModal = (id: string) => {
    setSessionToDelete(id);
    setOpen(true);
  };

  if (Object.keys(sessions).length === 0) {
    return (
      <div className="mt-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No sessions found.{" "}
          <Link
            to={dashboardRoutes.upload}
            className="app-focus-ring rounded-sm text-sky-600 underline hover:text-sky-800"
          >
            Upload a file
          </Link>{" "}
          to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 ">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Manage Sessions
      </h3>
      <DeletionModal
        callback={async () => {
          if (sessionToDelete) {
            await _deleteSession(sessionToDelete);
            setSessionToDelete(null);
            setOpen(false);
          }
        }}
        open={open}
        setOpen={setOpen}
      />
      <ul className="mt-4 divide-y-2 bg-white dark:bg-gray-800">
        {sessions &&
          Object.keys(sessions).map((key) => {
            const session = sessions[key];
            return (
              <li
                key={key}
                className="mx-4 flex items-center justify-between gap-x-6 py-5"
              >
                <div className="min-w-0">
                  <div className="flex items-start gap-x-3">
                    <p className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
                      {session.displayName ?? session.date}
                    </p>
                    <p className="mt-0.5 whitespace-nowrap rounded-md bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 dark:bg-gray-700 dark:text-gray-300">
                      {session.results.length} shots
                    </p>
                  </div>
                  <div className="mt-3 flex max-w-3xl flex-col gap-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      Environment
                      <select
                        value={draftMeta[key]?.environment ?? "unknown"}
                        onChange={(event) =>
                          setDraftMeta((prev) => ({
                            ...prev,
                            [key]: {
                              notes: prev[key]?.notes ?? session.notes ?? "",
                              environment: event.target
                                .value as SessionEnvironment,
                            },
                          }))
                        }
                        className="app-focus-ring ml-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      >
                        <option value="outdoor">Outdoor</option>
                        <option value="indoor">Indoor</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </label>
                    <textarea
                      value={draftMeta[key]?.notes ?? ""}
                      onChange={(event) =>
                        setDraftMeta((prev) => ({
                          ...prev,
                          [key]: {
                            environment:
                              prev[key]?.environment ??
                              session.environment ??
                              "unknown",
                            notes: event.target.value,
                          },
                        }))
                      }
                      rows={2}
                      placeholder="Session notes..."
                      className="app-focus-ring rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                </div>
                <div className="flex flex-none items-center gap-x-4">
                  <button
                    onClick={async () => {
                      setSavingMetaSession(key);
                      try {
                        await updateSessionMetadata(key, {
                          tags: session.tags ?? [],
                          notes: draftMeta[key]?.notes ?? "",
                          environment:
                            draftMeta[key]?.environment ??
                            session.environment ??
                            "unknown",
                        });
                      } finally {
                        setSavingMetaSession(null);
                      }
                    }}
                    className="app-focus-ring rounded-md bg-sky-600 px-2.5 py-1.5 text-sm text-white shadow-sm hover:bg-sky-500"
                    disabled={savingMetaSession === key}
                  >
                    {savingMetaSession === key ? "Saving..." : "Save notes"}
                  </button>
                  <button
                    onClick={async () => {
                      setRenamingSession(key);
                      try {
                        await regenerateSessionName(key);
                        setRenameCooldownSession(key);
                        window.setTimeout(() => {
                          setRenameCooldownSession((current) =>
                            current === key ? null : current,
                          );
                        }, 3000);
                      } finally {
                        setRenamingSession(null);
                      }
                    }}
                    className="app-focus-ring rounded-md bg-gray-200 px-2.5 py-1.5 text-sm text-gray-900 shadow-sm hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                    disabled={
                      renamingSession === key || renameCooldownSession === key
                    }
                  >
                    {renamingSession === key
                      ? "Renaming..."
                      : renameCooldownSession === key
                        ? "Wait..."
                        : "Rename"}
                  </button>
                  <button
                    onClick={() => showDeletionModal(key)}
                    className="app-focus-ring flex gap-1 rounded-md bg-red-600 px-2.5 py-1.5 text-sm text-white shadow-sm hover:bg-red-500"
                  >
                    <TrashIcon className="h-5 w-5" />
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
      </ul>
    </div>
  );
};

const DeletionModal = ({
  callback,
  open,
  setOpen,
}: {
  callback: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}) => {
  return (
    <Transition show={open}>
      <Dialog className="relative z-10" onClose={setOpen}>
        <Transition.Child
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all dark:bg-gray-800 sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-500 dark:hover:text-gray-300"
                    onClick={() => setOpen(false)}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon
                      className="h-6 w-6 text-red-600"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <Dialog.Title
                      as="h3"
                      className="text-base font-semibold leading-6 text-gray-900 dark:text-white"
                    >
                      Delete Session
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to delete this session? All of the
                        data will be permanently removed. This action cannot be
                        undone.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="app-focus-ring inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                    onClick={callback}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="app-focus-ring mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:hover:bg-gray-600 sm:mt-0 sm:w-auto"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
