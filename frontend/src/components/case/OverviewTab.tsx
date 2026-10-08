"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function OverviewTab({ caseId }: { caseId: string }) {
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<any[]>([]);
  const [suspectForm, setSuspectForm] = useState({ name: "", description: "" });
  const [victimForm, setVictimForm] = useState({ name: "", contact_info: "" });
  const [msg, setMsg] = useState("");

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    const created = await api.post(`/cases/${caseId}/notes`, { content: note });
    setNotes([created, ...notes]);
    setNote("");
  }

  async function addSuspect(e: React.FormEvent) {
    e.preventDefault();
    if (!suspectForm.name.trim()) return;
    await api.post(`/cases/${caseId}/suspects`, suspectForm);
    setMsg(`Suspect '${suspectForm.name}' added.`);
    setSuspectForm({ name: "", description: "" });
  }

  async function addVictim(e: React.FormEvent) {
    e.preventDefault();
    if (!victimForm.name.trim()) return;
    await api.post(`/cases/${caseId}/victims`, victimForm);
    setMsg(`Victim '${victimForm.name}' added.`);
    setVictimForm({ name: "", contact_info: "" });
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="panel rounded-lg p-4">
        <div className="text-xs font-mono text-muted mb-3">INVESTIGATOR NOTES</div>
        <form onSubmit={addNote} className="flex gap-2 mb-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note…"
            className="flex-1 bg-panel2 border hairline rounded px-3 py-2 text-sm outline-none focus:border-cyan"
          />
          <button className="bg-cyan/15 border border-cyan/40 text-cyan rounded px-3 text-sm">Add</button>
        </form>
        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
          {notes.map((n, i) => (
            <div key={i} className="text-sm text-text border-b hairline pb-2">{n.content}</div>
          ))}
          {!notes.length && <div className="text-sm text-muted">No notes yet.</div>}
        </div>
      </div>

      <div className="space-y-4">
        <div className="panel rounded-lg p-4">
          <div className="text-xs font-mono text-muted mb-3">ADD SUSPECT</div>
          <form onSubmit={addSuspect} className="space-y-2">
            <input
              value={suspectForm.name}
              onChange={(e) => setSuspectForm({ ...suspectForm, name: e.target.value })}
              placeholder="Name"
              className="w-full bg-panel2 border hairline rounded px-3 py-2 text-sm outline-none focus:border-cyan"
            />
            <input
              value={suspectForm.description}
              onChange={(e) => setSuspectForm({ ...suspectForm, description: e.target.value })}
              placeholder="Description"
              className="w-full bg-panel2 border hairline rounded px-3 py-2 text-sm outline-none focus:border-cyan"
            />
            <button className="bg-danger/15 border border-danger/40 text-danger rounded px-3 py-1.5 text-sm">Add Suspect</button>
          </form>
        </div>

        <div className="panel rounded-lg p-4">
          <div className="text-xs font-mono text-muted mb-3">ADD VICTIM</div>
          <form onSubmit={addVictim} className="space-y-2">
            <input
              value={victimForm.name}
              onChange={(e) => setVictimForm({ ...victimForm, name: e.target.value })}
              placeholder="Name"
              className="w-full bg-panel2 border hairline rounded px-3 py-2 text-sm outline-none focus:border-cyan"
            />
            <input
              value={victimForm.contact_info}
              onChange={(e) => setVictimForm({ ...victimForm, contact_info: e.target.value })}
              placeholder="Contact info"
              className="w-full bg-panel2 border hairline rounded px-3 py-2 text-sm outline-none focus:border-cyan"
            />
            <button className="bg-cyan/15 border border-cyan/40 text-cyan rounded px-3 py-1.5 text-sm">Add Victim</button>
          </form>
        </div>
        {msg && <div className="text-xs text-ok font-mono">{msg}</div>}
      </div>
    </div>
  );
}
