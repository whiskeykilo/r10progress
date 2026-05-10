import { Disclosure } from "@headlessui/react";
import { ChevronUpIcon } from "@heroicons/react/20/solid";

type BaseDisclosureProps = {
  title: string;
  children: React.ReactNode;
};

export const BaseDisclosure = ({ title, children }: BaseDisclosureProps) => {
  return (
    <Disclosure defaultOpen={true} as="div" className="mt-2">
      {({ open }) => (
        <>
          <Disclosure.Button className="flex w-full justify-between rounded-lg bg-sky-100 px-4 py-2 text-left text-sm font-medium text-sky-900 hover:bg-sky-200 focus:outline-none focus-visible:ring focus-visible:ring-sky-500/75 dark:bg-sky-900/30 dark:text-sky-300 dark:hover:bg-sky-900/50">
            <span className="text-xl font-bold">{title}</span>
            <ChevronUpIcon
              className={`${
                open ? "rotate-180 transform" : ""
              } h-5 w-5 self-center text-sky-500 dark:text-sky-400`}
            />
          </Disclosure.Button>
          <Disclosure.Panel className="mb-6 pt-4 text-sm text-gray-500 dark:text-gray-400">
            {children}
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
};
