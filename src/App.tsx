import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { User, MessageSquare } from 'lucide-react';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  assignee: string;
  comments: number;
  columnId: string;
}

interface Column {
  id: string;
  title: string;
}

const COLUMNS: Column[] = [
  { id: 'INBOX', title: 'INBOX' },
  { id: 'BACKLOG', title: 'BACKLOG' },
  { id: 'TODO', title: 'TODO' },
  { id: 'IN PROGRESS', title: 'IN PROGRESS' },
  { id: 'REVIEW', title: 'REVIEW' },
  { id: 'DONE', title: 'DONE' },
];

const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Design Kanban UI',
    description: 'Create a visually appealing React interface.',
    priority: 'MEDIUM',
    assignee: 'Gemini CLI',
    comments: 0,
    columnId: 'IN PROGRESS',
  },
  {
    id: 'task-2',
    title: 'Initialize Workspace',
    description: 'Set up the basic project structure and dependencies.',
    priority: 'HIGH',
    assignee: 'Gemini CLI',
    comments: 1,
    columnId: 'DONE',
  },
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findColumn = (id: string) => {
    if (COLUMNS.find((col) => col.id === id)) {
      return id;
    }
    return tasks.find((task) => task.id === id)?.columnId;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findColumn(activeId);
    const overColumn = findColumn(overId);

    if (!activeColumn || !overColumn || activeColumn === overColumn) {
      return;
    }

    setTasks((prev) => {
      const activeIndex = prev.findIndex((t) => t.id === activeId);
      const overIndex = prev.findIndex((t) => t.id === overId);

      let newIndex;
      if (COLUMNS.find((col) => col.id === overId)) {
        newIndex = prev.length;
      } else {
        const isBelowOverItem =
          over &&
          active.rect.current.translated &&
          active.rect.current.translated.top >
            over.rect.top + over.rect.height;

        const modifier = isBelowOverItem ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : prev.length;
      }

      const updatedTasks = [...prev];
      updatedTasks[activeIndex] = {
        ...updatedTasks[activeIndex],
        columnId: overColumn,
      };

      return arrayMove(updatedTasks, activeIndex, newIndex);
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveTask(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findColumn(activeId);
    const overColumn = findColumn(overId);

    if (activeColumn && overColumn && activeColumn === overColumn) {
      const activeIndex = tasks.findIndex((t) => t.id === activeId);
      const overIndex = tasks.findIndex((t) => t.id === overId);

      if (activeIndex !== overIndex) {
        setTasks((prev) => arrayMove(prev, activeIndex, overIndex));
      }
    }

    setActiveTask(null);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 overflow-x-auto">
      <div className="flex gap-4 min-w-max">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasks.filter((t) => t.columnId === column.id)}
            />
          ))}
          <DragOverlay dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: {
                active: {
                  opacity: '0.5',
                },
              },
            }),
          }}>
            {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  key?: React.Key;
  column: Column;
  tasks: Task[];
}

function KanbanColumn({ column, tasks }: KanbanColumnProps) {
  return (
    <div className="w-72 flex flex-col gap-3">
      <div className="bg-[#ebedf0] px-3 py-2 rounded-md">
        <h2 className="text-[11px] font-bold text-[#5e6c84] tracking-wider uppercase">
          {column.title}
        </h2>
      </div>
      <div className="flex-1 flex flex-col gap-3 min-h-[200px]">
        <SortableContext
          id={column.id}
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

interface SortableTaskCardProps {
  key?: React.Key;
  task: Task;
}

function SortableTaskCard({ task }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} />
    </div>
  );
}

function TaskCard({ task, isOverlay }: { task: Task; isOverlay?: boolean }) {
  const priorityColors = {
    LOW: 'bg-blue-100 text-blue-700',
    MEDIUM: 'bg-[#fff4e5] text-[#b26200]',
    HIGH: 'bg-[#ffebe6] text-[#bf2600]',
  };

  return (
    <div
      className={`bg-white p-4 rounded-md shadow-sm border border-[#dfe1e6] flex flex-col gap-2 cursor-grab active:cursor-grabbing ${
        isOverlay ? 'shadow-xl rotate-2 scale-105' : ''
      }`}
    >
      <div className="flex justify-between items-start">
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
            priorityColors[task.priority]
          }`}
        >
          {task.priority}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-[#172b4d] leading-tight">
        {task.title}
      </h3>
      <p className="text-xs text-[#5e6c84] line-clamp-2">{task.description}</p>
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1.5 text-[#5e6c84]">
          <User size={14} className="text-[#42526e]" />
          <span className="text-[11px]">{task.assignee}</span>
        </div>
        {task.comments > 0 && (
          <div className="flex items-center gap-1 text-[#5e6c84]">
            <MessageSquare size={12} />
            <span className="text-[10px]">{task.comments} comments</span>
          </div>
        )}
      </div>
    </div>
  );
}
