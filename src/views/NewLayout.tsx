import { Dialog, Transition } from "@headlessui/react";
import {
  ArrowTrendingUpIcon,
  ArrowUpTrayIcon,
  Bars3Icon,
  BeakerIcon,
  ChartBarSquareIcon,
  Cog6ToothIcon,
  FolderIcon,
  HomeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, PropsWithChildren, useContext, useState } from "react";
import { NavLink } from "react-router-dom";
import { FullScreenSpinner } from "../components/FullScreenSpinner";
import { SessionPicker } from "../components/SessionPicker";
import { UserMenu } from "../components/UserMenu";
import { SessionContext } from "../provider/SessionContext";
import { dashboardRoutes } from "../routes";

// href must be in dashboardRoutes
type NavType = {
  name: string;
  href: string;
  icon: typeof HomeIcon;
};
const navigation: NavType[] = [
  {
    name: "Dashboard",
    href: dashboardRoutes.dashboard,
    icon: HomeIcon,
  },
  {
    name: "Upload",
    href: dashboardRoutes.upload,
    icon: ArrowUpTrayIcon,
  },
  {
    name: "Club Distances",
    href: dashboardRoutes.visualization,
    icon: ChartBarSquareIcon,
  },
  {
    name: "Sessions",
    href: dashboardRoutes.sessions,
    icon: FolderIcon,
  },
  {
    name: "Goals",
    href: dashboardRoutes.goals,
    icon: ArrowTrendingUpIcon,
  },
  {
    name: "AI Analysis",
    href: dashboardRoutes.aiAnalysis,
    icon: BeakerIcon,
  },
];

const GitHubMarkIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.475 2 2 6.475 2 12C2 16.425 4.8625 20.1625 8.8375 21.4875C9.3375 21.575 9.525 21.275 9.525 21.0125C9.525 20.775 9.5125 19.9875 9.5125 19.15C7 19.6125 6.35 18.5375 6.15 17.975C6.0375 17.6875 5.55 16.8 5.125 16.5625C4.775 16.375 4.275 15.9125 5.1125 15.9C5.9 15.8875 6.4625 16.625 6.65 16.925C7.55 18.4375 8.9875 18.0125 9.5625 17.75C9.65 17.1 9.9125 16.6625 10.2 16.4125C7.975 16.1625 5.65 15.3 5.65 11.475C5.65 10.3875 6.0375 9.4875 6.675 8.7875C6.575 8.5375 6.225 7.5125 6.775 6.1375C6.775 6.1375 7.6125 5.875 9.525 7.1625C10.325 6.9375 11.175 6.825 12.025 6.825C12.875 6.825 13.725 6.9375 14.525 7.1625C16.4375 5.8625 17.275 6.1375 17.275 6.1375C17.825 7.5125 17.475 8.5375 17.375 8.7875C18.0125 9.4875 18.4 10.375 18.4 11.475C18.4 15.3125 16.0625 16.1625 13.8375 16.4125C14.2 16.725 14.5125 17.325 14.5125 18.2625C14.5125 19.6 14.5 20.675 14.5 21.0125C14.5 21.275 14.6875 21.5875 15.1875 21.4875C17.1727 20.8173 18.8977 19.5415 20.1198 17.8395C21.3419 16.1376 21.9995 14.0953 22 12C22 6.475 17.525 2 12 2Z"
    />
  </svg>
);

export const NewLayout = ({ children }: PropsWithChildren) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { isLoading } = useContext(SessionContext);

  return (
    <>
      {isLoading && <FullScreenSpinner />}
      <div>
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-50 lg:hidden"
            onClose={setSidebarOpen}
          >
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-900/80" />
            </Transition.Child>

            <div className="fixed inset-0 flex">
              <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-in-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                      <button
                        type="button"
                        className="-m-2.5 p-2.5"
                        onClick={() => setSidebarOpen(false)}
                      >
                        <span className="sr-only">Close sidebar</span>
                        <XMarkIcon
                          className="h-6 w-6 text-white"
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </Transition.Child>
                  {/* Sidebar component, swap this element with another sidebar if you like */}
                  <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-sky-600 px-6 pb-4">
                    <div className="flex h-16 shrink-0 items-center">
                      <NavLink
                        to="/dashboard"
                        className="flex items-center gap-3"
                        onClick={() => setSidebarOpen(false)}
                      >
                        <img
                          src="/logo.png"
                          alt="R10Progress"
                          className="h-12 w-12 rounded-xl"
                        />
                        <span className="text-2xl font-bold text-white">
                          r10progress
                        </span>
                      </NavLink>
                    </div>
                    <nav className="flex flex-1 flex-col">
                      <ul role="list" className="flex flex-1 flex-col gap-y-7">
                        <li>
                          <ul role="list" className="-mx-2 space-y-1">
                            {navigation.map((item) => (
                              <li key={item.name}>
                                <NavLink
                                  to={item.href}
                                  onClick={() => setSidebarOpen(false)}
                                  className={({ isActive }) =>
                                    clsx(
                                      isActive
                                        ? "bg-sky-700 text-white"
                                        : "text-sky-200 hover:bg-sky-700 hover:text-white",
                                      "group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6",
                                    )
                                  }
                                >
                                  {({ isActive }) => (
                                    <>
                                      <item.icon
                                        className={clsx(
                                          isActive
                                            ? "text-white"
                                            : "text-sky-200 group-hover:text-white",
                                          "h-6 w-6 shrink-0",
                                        )}
                                        aria-hidden="true"
                                      />
                                      {item.name}
                                    </>
                                  )}
                                </NavLink>
                              </li>
                            ))}
                          </ul>
                        </li>
                        <li className="mt-auto">
                          <a
                            href="https://github.com/thraizz/r10progress"
                            target="_blank"
                            rel="noreferrer"
                            className="group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-sky-200/75 hover:bg-sky-700 hover:text-white"
                          >
                            <GitHubMarkIcon className="h-6 w-6 shrink-0 text-sky-200/75 group-hover:text-white" />
                            thraizz/r10progress
                          </a>
                          <NavLink
                            to="/settings"
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                              clsx(
                                isActive
                                  ? "bg-sky-700 text-white"
                                  : "text-sky-200 hover:bg-sky-700 hover:text-white",
                                "group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6",
                              )
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <Cog6ToothIcon
                                  className={clsx(
                                    isActive
                                      ? "text-white"
                                      : "text-sky-200 group-hover:text-white",
                                    "h-6 w-6 shrink-0",
                                  )}
                                  aria-hidden="true"
                                />
                                Settings
                              </>
                            )}
                          </NavLink>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Static sidebar for desktop */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
          {/* Sidebar component, swap this element with another sidebar if you like */}
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-sky-600 px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center">
              <NavLink to="/dashboard">
                <img
                  src="/logo.png"
                  alt="R10Progress"
                  className="h-12 w-12 rounded-xl"
                />
              </NavLink>
            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {navigation.map((item) => (
                      <li key={item.name}>
                        <NavLink
                          to={item.href}
                          className={({ isActive }) =>
                            clsx(
                              isActive
                                ? "bg-sky-700 text-white"
                                : "text-sky-200 hover:bg-sky-700 hover:text-white",
                              "group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6",
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <item.icon
                                className={clsx(
                                  isActive
                                    ? "text-white"
                                    : "text-sky-200 group-hover:text-white",
                                  "h-6 w-6 shrink-0",
                                )}
                                aria-hidden="true"
                              />
                              {item.name}
                            </>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </li>
                <li className="mt-auto">
                  <a
                    href="https://github.com/thraizz/r10progress"
                    target="_blank"
                    rel="noreferrer"
                    className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-sky-200/75 hover:bg-sky-700 hover:text-white"
                  >
                    <GitHubMarkIcon className="h-6 w-6 shrink-0 text-sky-200/75 group-hover:text-white" />
                    thraizz/r10progress
                  </a>
                  <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                      clsx(
                        isActive
                          ? "bg-sky-700 text-white"
                          : "text-sky-200 hover:bg-sky-700 hover:text-white",
                        "group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6",
                      )
                    }
                  >
                    <Cog6ToothIcon
                      className="h-6 w-6 shrink-0 text-sky-200 group-hover:text-white"
                      aria-hidden="true"
                    />
                    Settings
                  </NavLink>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="lg:pl-72">
          <div className="sticky top-0 z-40 flex shrink-0 items-center justify-between gap-x-4 border-b border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:gap-x-6 sm:px-6 lg:px-8">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-300 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>

            <div className="ml-auto flex items-center gap-3 sm:gap-4">
              <SessionPicker />
              <UserMenu />
            </div>
          </div>

          <main className="py-4 lg:py-10">
            <div className="px-0 sm:px-4 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
};
