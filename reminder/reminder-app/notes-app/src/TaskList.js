// src/TaskList.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { FiPlus, FiTrash2, FiX, FiChevronDown, FiChevronUp, FiArrowLeft } from 'react-icons/fi';
import './index.css';


export default function TaskList({ listId }) {
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const nav = useNavigate();

  const updateTask = async (taskId, data) => {
    await updateDoc(doc(db, 'lists', listId, 'tasks', taskId), data);
  };

  const deleteTask = async (taskId) => {
    await deleteDoc(doc(db, 'lists', listId, 'tasks', taskId));
  };

  useEffect(() => {
    if (!listId) return;
    const q = collection(db, 'lists', listId, 'tasks');
    return onSnapshot(q, snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [listId]);

  const addTask = async () => {
    if (!newTitle.trim()) return;
    const taskRef = doc(collection(db, 'lists', listId, 'tasks'));
    await setDoc(taskRef, {
      title: newTitle,
      deadline: newDeadline || null,
      subtasks: [],
      collapsed: false,
      createdAt: new Date()
    });
    setNewTitle('');
    setNewDeadline('');
  };

  return (
    <>
      <div className="back-row">
        <button className="btn-icon" onClick={() => nav('/')} title="Zurück">
          <FiArrowLeft />
        </button>
        <span>Meine Listen</span>
      </div>

      <input type="text" placeholder="Neue Aufgabe" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
      <input type="datetime-local" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} />
      <button className="btn-icon btn-add" onClick={addTask}><FiPlus /></button>

      {tasks.map(t => (
        <TaskCard key={t.id} task={t} listId={listId} updateTask={updateTask} deleteTask={deleteTask} />
      ))}
    </>
  );
}


function TaskCard({ task, listId, updateTask, deleteTask }) {
  const [subText, setSubText] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const doneCount = task.subtasks.filter(s => s.done).length;
  const totalCount = task.subtasks.length;
  let progress = totalCount
    ? Math.round((doneCount / totalCount) * 100)
    : (task.done ? 100 : 0);

  const now = Date.now();
  const deadlineTs = task.deadline ? new Date(task.deadline).getTime() : null;
  let deadlinePct = 0;
  let barColor = '#ffa600ff';
  if (deadlineTs) {
    const total = deadlineTs - (task.createdAt?.toDate?.()?.getTime?.() || now - 7 * 24 * 60 * 60 * 1000);
    const left = deadlineTs - now;
    deadlinePct = Math.min(100, Math.max(0, (left / total) * 100));
    if (left < 0) {
      deadlinePct = 100;
      barColor = '#ff3b30';
    }
  }

  const toggleCollapse = () => updateTask(task.id, { collapsed: !task.collapsed });

  const addSub = async () => {
    if (!subText.trim()) return;
    const updated = [...task.subtasks, { name: subText, done: false }];
    await updateTask(task.id, { subtasks: updated });
    setSubText('');
  };

  const toggleSub = async idx => {
    const updated = task.subtasks.map((s, i) => (i === idx ? { ...s, done: !s.done } : s));
    await updateTask(task.id, { subtasks: updated });
  };

  return (
    <div className="task-card">
      <div className="task-header">
        <input
          className="checkbox"
          type="checkbox"
          checked={task.done || false}
          onChange={async () => {
            await updateTask(task.id, { done: !task.done });
            const allDone = !task.done;
            const updated = task.subtasks.map(s => ({ ...s, done: allDone }));
            await updateTask(task.id, { subtasks: updated });
          }}
        />
        <span
  className="task-title"
  style={{ textDecoration: progress === 100 ? 'line-through' : 'none', flex: 1 }}
  onClick={toggleCollapse}
>
  {task.title}
</span>

{/* Mini-Fälligkeitsbalken nur zeigen, wenn eingeklappt und Deadline vorhanden */}
{!task.collapsed && task.deadline && (
  <div
    className="due-chip"
    title={`Fälligkeitsfortschritt: ${Math.round(deadlinePct)}% • Fällig: ${new Date(task.deadline).toLocaleString('de-DE')}`}
    aria-label="Fälligkeitsfortschritt"
    style={{ marginRight: 6 }}
  >
    <div
      className="due-chip-fill"
      style={{ width: `${deadlinePct}%`, background: barColor }}
    />
  </div>
)}

{/* Chevron + Delete Button */}
<div className="task-actions">
  <button className="btn-icon" onClick={toggleCollapse} title="Ein-/Ausklappen">
    {task.collapsed ? <FiChevronUp /> : <FiChevronDown />}
  </button>
  <button className="btn-icon btn-del" onClick={() => deleteTask(task.id)} title="Aufgabe löschen">
    <FiTrash2 />
  </button>
</div>

      </div>

      <div className={`task-details ${!task.collapsed ? '' : 'open'}`}>
        <label>Fortschritt: {progress}%</label>
        <div className="bar-back">
          <div className="bar-front" style={{ width: `${progress}%` }} />
        </div>
        {task.deadline && (
          <>
            <label>Fällig: {new Date(task.deadline).toLocaleString('de-DE')}</label>
            <div className="bar-back">
              <div className="bar-deadline" style={{ width: `${deadlinePct}%`, background: barColor }} key={tick} />
            </div>
          </>
        )}

        {task.subtasks.map((s, idx) => (
          <div key={idx} className="sub-row">
            <input className="checkbox" type="checkbox" checked={s.done} onChange={() => toggleSub(idx)} />
            <span style={{ textDecoration: s.done ? 'line-through' : 'none' }}>{s.name}</span>
            <button
              className="btn-icon btn-del"
              onClick={() => {
                const updated = task.subtasks.filter((_, i) => i !== idx);
                updateTask(task.id, { subtasks: updated });
              }}
              title="Unteraufgabe löschen"
            >
              <FiX />
            </button>
          </div>
        ))}

        <div className="sub-add">
          <input
            placeholder="Neue Unteraufgabe…"
            value={subText}
            onChange={e => setSubText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSub()}
          />
          <button className="btn-icon btn-other" onClick={addSub}><FiPlus /></button>
        </div>
      </div>
    </div>
  );
}

