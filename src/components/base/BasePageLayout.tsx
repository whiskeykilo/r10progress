type BasePageLayoutProps = {
  children?: React.ReactNode;
  title?: string;
};

export const BasePageLayout = ({ children, title }: BasePageLayoutProps) => (
  <div className="mx-4 flex flex-grow flex-col items-center justify-center gap-8 lg:mx-6">
    <div className="flex w-full flex-col gap-4 rounded-md bg-gray-100 p-4 shadow-md dark:bg-gray-800">
      {title ? (
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h1>
      ) : null}
      {children}
    </div>
  </div>
);
