import {
  ChartBarIcon,
  CloudArrowUpIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";
import { Link } from "react-router-dom";
import { dashboardRoutes } from "../routes";

const features = [
  {
    name: "Simple CSV Uploads",
    description:
      "Import Garmin R10 exports in seconds and keep sessions organized in one place.",
    icon: CloudArrowUpIcon,
  },
  {
    name: "Clear Practice Insights",
    description:
      "Track averages, dispersion, and trends to understand what to work on next.",
    icon: ChartBarIcon,
  },
  {
    name: "AI-Powered Recommendations",
    description:
      "Generate personalized analysis reports and drill ideas from your selected shots.",
    icon: SparklesIcon,
  },
];

export const Features = () => {
  return (
    <section className="overflow-hidden bg-white py-24 dark:bg-gray-900 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
          <div className="lg:pr-8 lg:pt-4">
            <div className="lg:max-w-lg">
              <h2 className="dark:text-brand-400 text-base font-semibold leading-7 text-brand-600">
                Built for Practice Sessions
              </h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                Analyze every session with confidence
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
                R10 Progress helps you upload, compare, and understand your golf
                sessions, so your next range session is focused and measurable.
              </p>
              <dl className="mt-10 max-w-xl space-y-8 text-base leading-7 text-gray-600 dark:text-gray-300 lg:max-w-none">
                {features.map((feature) => (
                  <div key={feature.name} className="relative pl-9">
                    <dt className="inline font-semibold text-gray-900 dark:text-white">
                      <feature.icon
                        className="dark:text-brand-400 absolute left-1 top-1 h-5 w-5 text-brand-600"
                        aria-hidden="true"
                      />
                      {feature.name}
                    </dt>{" "}
                    <dd className="inline">{feature.description}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <img
            src="https://tailwindui.com/img/component-images/dark-project-app-screenshot.png"
            alt="Product screenshot"
            className="w-[48rem] max-w-none rounded-xl shadow-xl ring-1 ring-gray-400/10 dark:ring-gray-700 sm:w-[57rem] md:-ml-4 lg:-ml-0"
            width={2432}
            height={1442}
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
};

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-white dark:bg-gray-900">
      <svg
        className="absolute inset-0 -z-10 h-full w-full stroke-gray-200 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)] dark:stroke-gray-800"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="0787a7c5-978c-4f66-83c7-11c213f99cb7"
            width={200}
            height={200}
            x="50%"
            y={-1}
            patternUnits="userSpaceOnUse"
          >
            <path d="M.5 200V.5H200" fill="none" />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          strokeWidth={0}
          fill="url(#0787a7c5-978c-4f66-83c7-11c213f99cb7)"
        />
      </svg>
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
        <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
          <img
            className="h-11"
            src="https://tailwindui.com/img/logos/mark.svg?color=sky&shade=600"
            alt="R10 Progress"
          />
          <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
            Turn R10 data into better practice decisions
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            Upload session exports, compare shot patterns, and get actionable AI
            feedback tailored to your game.
          </p>
          <div className="mt-10 flex items-center gap-x-6">
            <Link
              to={dashboardRoutes.upload}
              className="app-focus-ring rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500"
            >
              Upload a Session
            </Link>
            <Link
              to={dashboardRoutes.visualization}
              className="app-focus-ring rounded-sm text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100"
            >
              View Visualizations <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export const LandingPage = () => (
  <div>
    <Hero />
    <Features />
  </div>
);
