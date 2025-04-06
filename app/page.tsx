"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Define job type
interface Job {
  id: string;
  name: string;
  arrival: number;
  burst: number;
  remaining?: number;
  start?: number;
  end?: number;
  turnaround?: number;
  waitingTime?: number;
  order?: number;
  color?: string; // Add this line
}

// Define timeline event type
interface TimelineEvent {
  time: number;
  cpuAssignments: { [key: string]: string | null };
  queue: { name: string; remaining: number }[];
  isArrival?: boolean; // Flag to indicate if this is a job arrival event
}

// Define CPU execution segment for Gantt chart
interface ExecutionSegment {
  cpuId: string;
  jobName: string;
  startTime: number;
  endTime: number;
  color: string;
}

const names: string[] = ["J1", "J2", "J3", "J4"];
const arrival = [0, 0.5, 1, 1];
const burst = [4, 2, 6, 1.5];
const test_jobs: Job[] = names.map((name, id) => {
  return {
    id: id.toString(),
    name: name,
    arrival: arrival[id],
    burst: burst[id],
    order: id + 1,
  };
});

export default function JobSchedulerPage() {
  // System configuration
  const [numCPUs, setNumCPUs] = useState<number>(2);
  const [timeQuantum, setTimeQuantum] = useState<number>(1);

  // Jobs management
  const [jobs, setJobs] = useState<Job[]>([...test_jobs]);
  const [newJobName, setNewJobName] = useState<string>("");
  const [newJobArrival, setNewJobArrival] = useState<number>(0);
  const [newJobBurst, setNewJobBurst] = useState<number>(1);

  // Results
  const [results, setResults] = useState<Job[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [executionSegments, setExecutionSegments] = useState<
    ExecutionSegment[]
  >([]);
  const [calculated, setCalculated] = useState<boolean>(false);
  const [usedColorIndices, setUsedColorIndices] = useState<number[]>([]);

  // Job colors for Gantt chart
  const jobColors = [
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

  // Get next available color
  const getNextColor = () => {
    // Find the first unused color index
    let colorIndex = 0;
    while (usedColorIndices.includes(colorIndex)) {
      colorIndex = (colorIndex + 1) % jobColors.length;
    }

    // Update used colors
    setUsedColorIndices([...usedColorIndices, colorIndex]);

    return jobColors[colorIndex];
  };

  // Add a new job
  const addJob = () => {
    if (newJobName.trim() === "") {
      toast.error("Please enter the job name");
      return;
    }

    const newJob: Job = {
      id: Date.now().toString(),
      name: newJobName,
      arrival: newJobArrival,
      burst: newJobBurst,
      order: jobs.length,
      color: getNextColor(), // Assign a unique color
    };

    setJobs([...jobs, newJob]);
    setNewJobName("");
    setNewJobArrival(0);
    setNewJobBurst(1);
  };

  // Remove a job
  const removeJob = (id: string) => {
    const jobToRemove = jobs.find((job) => job.id === id);
    if (jobToRemove && jobToRemove.color) {
      // Find the index of this color
      const colorIndex = jobColors.indexOf(jobToRemove.color);
      // Remove this index from used colors
      setUsedColorIndices(
        usedColorIndices.filter((index) => index !== colorIndex)
      );
    }
    setJobs(jobs.filter((job) => job.id !== id));
  };

  // Calculate the schedule using Shortest Remaining Time Next
  const calculateSchedule = () => {
    if (jobs.length === 0) return;

    // Core SRTN scheduler implementation with timeline tracking
    const srtnScheduler = (
      jobs: Job[],
      numCPUs: number,
      timeQuantum: number
    ) => {
      // Initialize variables
      let time = 0.0;
      const completed: Job[] = [];
      const timeline: TimelineEvent[] = [];
      const segments: ExecutionSegment[] = [];

      // Create a copy of jobs with remaining time set to burst time
      let readyQueue = [...jobs]
        .map((job) => ({
          ...job,
          remaining: job.burst,
          start: -1,
        }))
        .sort((a, b) => a.arrival - b.arrival);

      // Track active CPUs and their assigned jobs
      const activeCPUs: {
        cpuId: string;
        job: Job;
        quantumLeft: number;
        segmentStart: number;
      }[] = [];

      // Initialize CPU assignments
      const cpuAssignments: { [key: string]: string | null } = {};
      for (let i = 0; i < numCPUs; i++) {
        cpuAssignments[`CPU${i + 1}`] = null;
      }

      // Record initial state
      timeline.push({
        time: time,
        cpuAssignments: { ...cpuAssignments },
        queue: readyQueue
          .filter((job) => job.arrival <= time)
          .map((job) => ({ name: job.name, remaining: job.remaining! })),
      });

      // Get all unique arrival times to ensure we record events at these times
      const arrivalTimes = [
        ...new Set(readyQueue.map((job) => job.arrival)),
      ].sort((a, b) => a - b);
      // Pre-create events for all job arrivals
      for (const arrivalTime of arrivalTimes) {
        if (arrivalTime > 0) {
          // Skip time 0 as we already recorded it
          const jobsAtThisTime = readyQueue.filter(
            (job) => job.arrival === arrivalTime
          );

          if (jobsAtThisTime.length > 0) {
            // Create a special event for this arrival time
            timeline.push({
              time: arrivalTime,
              cpuAssignments: { ...cpuAssignments }, // Current CPU assignments
              queue: jobsAtThisTime.map((job) => ({
                name: job.name,
                remaining: job.remaining!,
              })),
            });
          }
        }
      }

      // Main scheduling loop - continue until all jobs are completed
      while (readyQueue.length > 0 || activeCPUs.length > 0) {
        // Find jobs that have arrived by the current time
        let available = readyQueue.filter(
          (job) => job.arrival <= time + 0.0001
        );

        // Assign jobs to available CPUs (shortest remaining time first)
        let assignmentsMade = false;
        while (activeCPUs.length < numCPUs && available.length > 0) {
          assignmentsMade = true;

          // Find job with shortest remaining time
          const shortest = available.reduce((min, curr) =>
            curr.remaining! < min.remaining! ? curr : min
          );

          // Set start time if this is the first time the job runs
          shortest.start = shortest.start === -1 ? time : shortest.start;

          // Find an available CPU
          const availableCPUId =
            Object.keys(cpuAssignments).find(
              (cpuId) => cpuAssignments[cpuId] === null
            ) || `CPU${activeCPUs.length + 1}`;

          // Add job to active CPUs
          activeCPUs.push({
            cpuId: availableCPUId,
            job: shortest,
            quantumLeft: timeQuantum,
            segmentStart: time,
          });

          // Update CPU assignments
          cpuAssignments[availableCPUId] = shortest.name;

          // Remove job from ready queue and available jobs
          readyQueue = readyQueue.filter((j) => j !== shortest);
          available = available.filter((j) => j !== shortest);
        }

        // If no jobs are running but jobs will arrive later, jump to next arrival time
        if (activeCPUs.length === 0 && readyQueue.length > 0) {
          const oldTime = time;
          time = readyQueue[0].arrival;
          const time_point_idx = timeline.findIndex(
            (item) => item.time === time
          );
          const new_timeevent = {
            time: time,
            cpuAssignments: { ...cpuAssignments },
            queue: readyQueue
              .filter((job) => job.arrival <= time)
              .map((job) => ({ name: job.name, remaining: job.remaining! })),
          };
          if (time_point_idx !== -1) {
            timeline[time_point_idx] = new_timeevent;
          } else {
            timeline.push(new_timeevent);
          }

          continue;
        }
        // If no jobs are running and no jobs will arrive, we're done
        else if (activeCPUs.length === 0) {
          break;
        }

        // Calculate how much time to advance
        const nextArrival =
          readyQueue.length > 0
            ? readyQueue[0].arrival
            : Number.POSITIVE_INFINITY;
        const minQuantum = Math.min(
          ...activeCPUs.map((cpu) => cpu.quantumLeft)
        );
        const timeStep =
          Math.min(minQuantum, Math.max(nextArrival - time, 0)) || minQuantum;

        // Check if there's a job arrival before the next calculated time step
        const nextTime = time + timeStep;
        const arrivalsBeforeNextTime = arrivalTimes.filter(
          (t) => t > time && t < nextTime
        );

        // If there are arrivals before the next time step, process them one by one
        if (arrivalsBeforeNextTime.length > 0) {
          // Process the first arrival
          time = arrivalsBeforeNextTime[0];
          const time_point_idx = timeline.findIndex(
            (item) => item.time === time
          );
          const new_timeevent = {
            time: time,
            cpuAssignments: { ...cpuAssignments },
            queue: readyQueue
              .filter((job) => job.arrival <= time)
              .map((job) => ({ name: job.name, remaining: job.remaining! })),
          };

          // Record the arrival event
          if (time_point_idx !== -1) {
            timeline[time_point_idx] = new_timeevent;
          } else {
            timeline.push(new_timeevent);
          }
          continue; // Restart the loop to process this arrival
        }

        // Advance time
        const oldTime = time;
        time += timeStep;

        // Update job progress and handle completions/quantum expirations
        let stateChanged = false;
        for (let i = activeCPUs.length - 1; i >= 0; i--) {
          const cpu = activeCPUs[i];
          const oldRemaining = cpu.job.remaining!;
          cpu.job.remaining! -= timeStep;
          cpu.quantumLeft -= timeStep;

          // Check if job is completed
          if (cpu.job.remaining! <= 0.0001) {
            stateChanged = true;

            // Create execution segment
            segments.push({
              cpuId: cpu.cpuId,
              jobName: cpu.job.name,
              startTime: cpu.segmentStart,
              endTime: time,
              color:
                cpu.job.color ||
                jobColors[Number.parseInt(cpu.job.id) % jobColors.length],
            });

            // Mark job as completed
            completed.push({
              ...cpu.job,
              remaining: 0,
              end: time,
              turnaround: time - cpu.job.arrival,
              waitingTime: time - cpu.job.arrival - cpu.job.burst,
            });

            // Update CPU assignments
            cpuAssignments[cpu.cpuId] = null;

            // Remove job from active CPUs
            activeCPUs.splice(i, 1);
          }
          // Check if time quantum expired
          else if (cpu.quantumLeft <= 0.0001) {
            stateChanged = true;

            // Create execution segment
            segments.push({
              cpuId: cpu.cpuId,
              jobName: cpu.job.name,
              startTime: cpu.segmentStart,
              endTime: time,
              color:
                cpu.job.color ||
                jobColors[Number.parseInt(cpu.job.id) % jobColors.length],
            });

            // Quantum expired, but job not completed
            if (cpu.job.remaining! > 0) {
              // Return job to ready queue
              readyQueue.push({
                ...cpu.job,
                remaining: cpu.job.remaining!,
                start: cpu.job.start!,
              });
            }

            // Update CPU assignments
            cpuAssignments[cpu.cpuId] = null;

            // Remove job from active CPUs
            activeCPUs.splice(i, 1);
          }
        }

        // Re-sort ready queue by remaining time (shortest first)
        if (readyQueue.length > 1) {
          readyQueue.sort((a, b) => a.remaining! - b.remaining!);
        }
        // Record state after processing if state changed
        if (stateChanged) {
          const time_point_idx = timeline.findIndex(
            (item) => item.time === time
          );
          const new_timeevent = {
            time: time,
            cpuAssignments: { ...cpuAssignments },
            queue: readyQueue
              .filter((job) => job.arrival <= time)
              .map((job) => ({ name: job.name, remaining: job.remaining! })),
          };

          // Record the arrival event
          if (time_point_idx !== -1) {
            timeline[time_point_idx] = new_timeevent;
          } else {
            timeline.push(new_timeevent);
          }
        }
      }

      // Sort timeline events by time
      timeline.sort((a, b) => a.time - b.time);

      return { completed, timeline, segments };
    };

    // Run the scheduler
    const { completed, timeline, segments } = srtnScheduler(
      jobs,
      numCPUs,
      timeQuantum
    );

    // Format results for display (round to 2 decimal places)
    const formattedResults = completed.map((job) => ({
      ...job,
      start: Number(job.start!.toFixed(2)),
      end: Number(job.end!.toFixed(2)),
      turnaround: Number(job.turnaround!.toFixed(2)),
      waitingTime: Number(job.waitingTime!.toFixed(2)),
    }));

    // Sort results by the original order
    formattedResults.sort((a, b) => (a.order || 0) - (b.order || 0));

    // Set results
    setResults(formattedResults);
    setTimelineEvents(timeline);
    setExecutionSegments(segments);
    setCalculated(true);
  };

  // Get unique time points for the Gantt chart
  const getTimePoints = () => {
    if (!timelineEvents.length) return [];

    // Get all unique time points from timeline events
    const allTimePoints = [
      ...new Set(timelineEvents.map((event) => event.time)),
    ];

    // Add end times from execution segments if they're not already included
    executionSegments.forEach((segment) => {
      if (!allTimePoints.includes(segment.endTime)) {
        allTimePoints.push(segment.endTime);
      }
    });

    // Sort time points
    return [...new Set(allTimePoints)].sort((a, b) => a - b);
  };

  // Get job queue at a specific time
  const getQueueAtTime = (time: number) => {
    // Find the exact event at this time first
    const exactEvent = timelineEvents.find(
      (event) => Math.abs(event.time - time) < 0.0001
    );
    if (exactEvent) {
      return exactEvent.queue;
    }

    // If no exact event, find the event at or just before this time
    const events = timelineEvents.filter((event) => event.time <= time);
    if (events.length === 0) return [];

    const latestEvent = events.reduce((latest, current) =>
      current.time > latest.time ? current : latest
    );

    return latestEvent.queue;
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-16 items-center border-b bg-background px-4 md:px-6">
        <div className="flex items-center justify-center gap-2 w-full">
          <CalendarClock className="h-6 w-6" />
          <h1 className="text-xl text-center font-semibold">
            Shortest Remaining Time Next Job Scheduling Algorithm
          </h1>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex flex-col gap-10 p-4 md:p-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Configuration Section */}
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="num-cpus">Number of CPUs</Label>
                  <Input
                    id="num-cpus"
                    type="number"
                    min="1"
                    value={numCPUs}
                    onChange={(e) =>
                      setNumCPUs(Number.parseInt(e.target.value) || 1)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time-quantum">Time Quantum (s)</Label>
                  <Input
                    id="time-quantum"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={timeQuantum}
                    onChange={(e) =>
                      setTimeQuantum(Number.parseFloat(e.target.value) || 1)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job Management Section */}
          <Card>
            <CardHeader>
              <CardTitle>Add Jobs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="job-name">Job Name</Label>
                  <Input
                    id="job-name"
                    value={newJobName}
                    onChange={(e) => setNewJobName(e.target.value)}
                    placeholder="J1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arrival-time">Arrival Time (s)</Label>
                  <Input
                    id="arrival-time"
                    type="number"
                    min="0"
                    step="0.1"
                    value={newJobArrival}
                    onChange={(e) =>
                      setNewJobArrival(Number.parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="burst-time">Burst Time (s)</Label>
                  <Input
                    id="burst-time"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={newJobBurst}
                    onChange={(e) =>
                      setNewJobBurst(Number.parseFloat(e.target.value) || 0.1)
                    }
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={addJob} className="w-full cursor-pointer">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Job
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                className="bg-[#6356f9] hover:bg-[#8d43e8] cursor-pointer"
                onClick={calculateSchedule}
              >
                <Calculator />
                Calculate Schedule
              </Button>
            </CardFooter>
          </Card>
        </div>
        <div className="grid gap-10 grid-cols-none">
          {!calculated && (
            <Card className="">
              <CardHeader>
                <CardTitle>Jobs Table</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Job</TableHead>
                      <TableHead className="text-center">
                        Arrival Time (s)
                      </TableHead>
                      <TableHead className="text-center">
                        Burst Time (s)
                      </TableHead>
                      <TableHead className="text-center">
                        Start Time (s)
                      </TableHead>
                      <TableHead className="text-center">
                        End Time (s)
                      </TableHead>
                      <TableHead className="text-center">
                        Turnaround Time (s)
                      </TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>{job.name}</TableCell>
                        <TableCell>{job.arrival}</TableCell>
                        <TableCell>{job.burst}</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeJob(job.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Results Section */}
          {calculated && (
            <Card className="">
              <CardHeader>
                <CardTitle>Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Job</TableHead>
                      <TableHead className="text-center">
                        Arrival Time (s)
                      </TableHead>
                      <TableHead className="text-center">
                        Burst Time (s)
                      </TableHead>
                      <TableHead className="text-center">
                        Start Time (s)
                      </TableHead>
                      <TableHead className="text-center">
                        End Time (s)
                      </TableHead>
                      <TableHead className="text-right">
                        Turnaround Time (s)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>{job.name}</TableCell>
                        <TableCell>{job.arrival}</TableCell>
                        <TableCell>{job.burst}</TableCell>
                        <TableCell>{job.start}</TableCell>
                        <TableCell>{job.end}</TableCell>
                        <TableCell className="text-right">
                          {job.turnaround}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="">
                      <TableCell colSpan={6} className="text-right">
                        <strong>Average Turnaround</strong>:&nbsp;
                        {(
                          results.reduce(
                            (sum, job) => sum + job.turnaround!,
                            0
                          ) / results.length
                        ).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Gantt Chart */}
          {calculated && (
            <Card className="min-h-full">
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="min-w-[800px] h-[500px]">
                    {/* Time Scale */}
                    <div className="relative h-8 ml-16 border-b">
                      {getTimePoints().map((time, i) => {
                        const totalTime =
                          getTimePoints().length > 0
                            ? getTimePoints()[getTimePoints().length - 1]
                            : 0;
                        const position = (time / totalTime) * 100;

                        return (
                          <div
                            key={i}
                            className="absolute"
                            style={{
                              left: `${position}%`,
                              transform: "translateX(-50%)",
                            }}
                          >
                            <div className="text-xs text-center">
                              {time.toFixed(1)}
                            </div>
                            <div className="h-4 w-px bg-gray-400 mx-auto" />
                          </div>
                        );
                      })}
                    </div>
                    {/* CPU Timeline Rows */}
                    <div className="">
                      {Array.from({ length: numCPUs }).map((_, cpuIndex) => {
                        const cpuId = `CPU${cpuIndex + 1}`;
                        const cpuSegments = executionSegments.filter(
                          (seg) => seg.cpuId === cpuId
                        );
                        const timePoints = getTimePoints();
                        const totalTime =
                          timePoints.length > 0
                            ? timePoints[timePoints.length - 1]
                            : 0;

                        return (
                          <div key={cpuId} className="relative h-12 mb-1">
                            {/* CPU Label */}
                            <div className="absolute left-0 top-0 bottom-0 w-16 flex items-center justify-center font-medium border-r">
                              {cpuId}
                            </div>

                            {/* Timeline */}
                            <div className="ml-16 h-full relative border-b">
                              {/* Job Segments */}
                              {cpuSegments.map((segment, i) => {
                                const startPercent =
                                  (segment.startTime / totalTime) * 100;
                                const widthPercent =
                                  ((segment.endTime - segment.startTime) /
                                    totalTime) *
                                  100;

                                return (
                                  <div
                                    key={i}
                                    className={`absolute top-0 bottom-0 ${segment.color} flex items-center justify-center text-white font-medium border-l border-r border-gray-700`}
                                    style={{
                                      left: `${startPercent}%`,
                                      width: `${widthPercent}%`,
                                    }}
                                  >
                                    {segment.jobName}
                                  </div>
                                );
                              })}

                              {/* Time Markers */}
                              {timePoints.map((time, i) => {
                                const position = (time / totalTime) * 100;
                                return (
                                  <div
                                    key={i}
                                    className="absolute top-0 bottom-0 w-px bg-gray-300"
                                    style={{ left: `${position}%` }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Job Queue */}
                    <div className="mt-4 ml-16 relative">
                      {getTimePoints().map((time, i) => {
                        const totalTime =
                          getTimePoints().length > 0
                            ? getTimePoints()[getTimePoints().length - 1]
                            : 0;
                        const position = (time / totalTime) * 100;
                        const queue = getQueueAtTime(time);

                        // Always show job queues, even if empty
                        return (
                          <div
                            key={i}
                            className="absolute text-center"
                            style={{
                              left: `${position}%`,
                              transform: "translateX(-50%)",
                            }}
                          >
                            <div className="h-4 w-px bg-gray-400 mx-auto" />
                            <div className="text-xs pt-1">
                              {queue.length > 0 ? (
                                queue.map((job, j) => (
                                  <div key={j}>
                                    {job.name} = {job.remaining.toFixed(1)}
                                  </div>
                                ))
                              ) : (
                                <div className="text-gray-400">Empty</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
