import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { Fragment } from "react";

export const BaseListbox = ({
  options,
  setOption,
  value,
  valueText = "-",
}: {
  options: string[];
  setOption: (option: string) => void;
  value: string;
  valueText?: string;
}) =>
  options.length > 0 ? (
    <Listbox
      value={value}
      onChange={(value) => {
        setOption(value);
      }}
    >
      <div className="relative mt-1 w-full min-w-48">
        <Listbox.Button className="app-focus-ring relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md dark:bg-gray-800 dark:text-white sm:text-sm">
          <span className="block truncate">{valueText}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon
              className="h-5 w-5 text-gray-400"
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
          <Listbox.Options className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none dark:bg-gray-800 dark:ring-white/10 sm:text-sm">
            {options.map((value, valueId) => (
              <Listbox.Option
                key={valueId}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active
                      ? "text-brand-900 dark:bg-brand-900/30 dark:text-brand-200 bg-brand-100"
                      : "text-gray-900 dark:text-gray-100"
                  }`
                }
                value={value}
              >
                {({ selected }) => (
                  <>
                    <span
                      className={`block truncate ${
                        selected ? "font-medium" : "font-normal"
                      }`}
                    >
                      {value}
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-brand-600">
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
  ) : null;
