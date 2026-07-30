/// <reference lib="webworker" />

import { createSimulation, type Simulation, type Tuning } from "./graph-force";

type Seed = { id: string; x: number; y: number; r?: number; pinned?: boolean };
type Edge = { from: string; to: string };
type Message =
  | { type: "init"; generation: number; seed: Seed[]; edges: Edge[]; tuning: Tuning }
  | { type: "tuning"; tuning: Tuning }
  | { type: "reheat"; alpha?: number }
  | { type: "move"; id: string; x: number; y: number; pinned: boolean }
  | { type: "pin"; id: string; pinned: boolean }
  | { type: "stop" };

let simulation: Simulation | null = null;
let generation = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

function schedule() {
  if (timer || !simulation) return;
  timer = setTimeout(step, 16);
}

function step() {
  timer = null;
  if (!simulation) return;
  const alive = simulation.tick();
  const positions = new Float32Array(simulation.nodes.length * 2);
  simulation.nodes.forEach((node, index) => {
    positions[index * 2] = node.x;
    positions[index * 2 + 1] = node.y;
  });
  self.postMessage({ type: "frame", generation, positions: positions.buffer }, [positions.buffer]);
  if (alive) schedule();
}

self.onmessage = (event: MessageEvent<Message>) => {
  const message = event.data;
  if (message.type === "init") {
    generation = message.generation;
    simulation = createSimulation(message.seed, message.edges, message.tuning);
    schedule();
    return;
  }
  if (!simulation) return;
  if (message.type === "tuning") {
    simulation.setTuning(message.tuning);
    simulation.reheat(0.5);
    schedule();
  } else if (message.type === "reheat") {
    simulation.reheat(message.alpha);
    schedule();
  } else if (message.type === "move") {
    const node = simulation.nodes.find((item) => item.id === message.id);
    if (!node) return;
    node.x = message.x;
    node.y = message.y;
    node.vx = 0;
    node.vy = 0;
    node.pinned = message.pinned;
    simulation.reheat(0.35);
    schedule();
  } else if (message.type === "pin") {
    const node = simulation.nodes.find((item) => item.id === message.id);
    if (!node) return;
    node.pinned = message.pinned;
    if (!message.pinned) {
      simulation.reheat(0.5);
      schedule();
    }
  } else if (message.type === "stop") {
    simulation = null;
    if (timer) clearTimeout(timer);
    timer = null;
  }
};

export {};
