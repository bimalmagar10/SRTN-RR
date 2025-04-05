import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Job } from "@/app/page";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const names: string[][] = [
  ["J1", "J2", "J3", "J4"],
  ["J1", "J2", "J3", "J4", "J5", "J6"],
  ["J1", "J2", "J3", "J4", "J5", "J6", "J7"],
];
const arrival = [
  [0, 0.5, 1, 1],
  [0, 0, 0, 5, 15, 25],
  [0, 0, 0, 5, 11, 16, 25],
];
const burst = [
  [4, 2, 6, 1.5],
  [40, 50, 60, 30, 20, 10],
  [30, 20, 10, 12, 14, 18, 24],
];
const jobs: Job[][] = names.map((name, id) => {
  const arr: Job[] = name.map((item, idx) => {
    return {
      id: idx.toString(),
      name: item,
      arrival: arrival[id][idx],
      burst: burst[id][idx],
      order: idx + 1,
    };
  });
  return arr;
});

export const exampleJobs = {
  default: jobs[0],
  example1: jobs[1],
  example2: jobs[2],
};

export const jobColors = [
  "bg-teal-400",
  "bg-orange-400",
  "bg-red-400",
  "bg-blue-400",
  "bg-purple-400",
  "bg-green-400",
  "bg-yellow-400",
  "bg-pink-400",
  "bg-indigo-400",
  "bg-cyan-400",
  "bg-lime-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-fuchsia-400",
  "bg-rose-400",
  "bg-sky-400",
  "bg-violet-400",
];
