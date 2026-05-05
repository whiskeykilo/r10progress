import { Tab } from "@headlessui/react";
import clsx from "clsx";

interface TabItem {
  id: number;
  content: React.ReactNode;
}

interface TabsProps {
  categories: Record<string, TabItem[]>;
}

export const BaseTabs: React.FC<TabsProps> = ({ categories }) => {
  return (
    <div className="w-full px-2 sm:px-0">
      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-700">
          {Object.keys(categories).map((category) => (
            <Tab
              key={category}
              className={({ selected }) =>
                clsx(
                  "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                  "ring-white ring-opacity-60 ring-offset-2 ring-offset-indigo-400 focus:outline-none focus:ring-2",
                  selected
                    ? "bg-white text-indigo-700 shadow dark:bg-gray-800 dark:text-indigo-400"
                    : "text-indigo-900 hover:bg-white dark:text-indigo-300 dark:hover:bg-gray-800",
                )
              }
            >
              {category}
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className="mt-2">
          {Object.values(categories).map((posts, idx) => (
            <Tab.Panel
              key={idx}
              className="w-full rounded-lg bg-white p-3 ring-white ring-opacity-60 focus:outline-none dark:bg-gray-800"
            >
              {posts.map((post) => (
                <div key={post.id}>{post.content}</div>
              ))}
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export type { TabItem, TabsProps };
