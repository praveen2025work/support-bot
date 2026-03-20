"use client";

import { useState, useRef } from "react";
import { X, Plus, Pencil, Trash2, Calculator } from "lucide-react";
import type { CalculatedField } from "@/types/dashboard";

interface CalculatedFieldEditorProps {
  fields: CalculatedField[];
  availableColumns: string[];
  onSave: (fields: CalculatedField[]) => void;
  onClose: () => void;
}

interface FormState {
  name: string;
  expression: string;
  format: "number" | "currency" | "percent";
}

const emptyForm: FormState = { name: "", expression: "", format: "number" };

export function CalculatedFieldEditor({
  fields,
  availableColumns,
  onSave,
  onClose,
}: CalculatedFieldEditorProps) {
  const [localFields, setLocalFields] = useState<CalculatedField[]>(() =>
    fields.map((f) => ({ ...f })),
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<{ name?: string; expression?: string }>(
    {},
  );
  const expressionRef = useRef<HTMLInputElement>(null);

  const validate = (): boolean => {
    const next: { name?: string; expression?: string } = {};
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      next.name = "Name is required";
    } else {
      const duplicate = localFields.some(
        (f, i) =>
          f.name.toLowerCase() === trimmedName.toLowerCase() &&
          i !== (editingIndex === -1 ? -2 : editingIndex),
      );
      if (duplicate) next.name = "A field with this name already exists";
    }
    if (!form.expression.trim()) {
      next.expression = "Expression is required";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const startAdd = () => {
    setEditingIndex(-1);
    setForm(emptyForm);
    setErrors({});
  };

  const startEdit = (index: number) => {
    const field = localFields[index];
    setEditingIndex(index);
    setForm({
      name: field.name,
      expression: field.expression,
      format: field.format ?? "number",
    });
    setErrors({});
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setForm(emptyForm);
    setErrors({});
  };

  const saveField = () => {
    if (!validate()) return;
    const trimmedName = form.name.trim();
    const trimmedExpr = form.expression.trim();

    if (editingIndex === -1) {
      const newField: CalculatedField = {
        id: `calc_${Date.now()}`,
        name: trimmedName,
        expression: trimmedExpr,
        format: form.format,
      };
      setLocalFields([...localFields, newField]);
    } else if (editingIndex !== null) {
      setLocalFields(
        localFields.map((f, i) =>
          i === editingIndex
            ? {
                ...f,
                name: trimmedName,
                expression: trimmedExpr,
                format: form.format,
              }
            : f,
        ),
      );
    }
    cancelEdit();
  };

  const deleteField = (index: number) => {
    setLocalFields(localFields.filter((_, i) => i !== index));
    if (editingIndex === index) cancelEdit();
  };

  const insertColumn = (col: string) => {
    const input = expressionRef.current;
    const token = `{${col}}`;
    if (input) {
      const start = input.selectionStart ?? form.expression.length;
      const end = input.selectionEnd ?? start;
      const next =
        form.expression.slice(0, start) + token + form.expression.slice(end);
      setForm({ ...form, expression: next });
      requestAnimationFrame(() => {
        input.focus();
        const pos = start + token.length;
        input.setSelectionRange(pos, pos);
      });
    } else {
      setForm({ ...form, expression: form.expression + token });
    }
  };

  const updateForm = (patch: Partial<FormState>) => {
    setForm({ ...form, ...patch });
    if (errors.name || errors.expression) setErrors({});
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Calculated Fields
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Field list */}
          {localFields.length === 0 && editingIndex === null && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No calculated fields yet. Add one below.
            </p>
          )}
          {localFields.map((field, i) =>
            editingIndex === i ? null : (
              <div
                key={field.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                    {field.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {field.expression}
                  </p>
                  {field.format && (
                    <span className="text-xs text-blue-500 capitalize">
                      {field.format}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  <button
                    onClick={() => startEdit(i)}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteField(i)}
                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ),
          )}

          {/* Inline form */}
          {editingIndex !== null && (
            <div className="p-4 rounded-lg border-2 border-blue-300 dark:border-blue-600 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                  placeholder="e.g. Profit Margin"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {errors.name && (
                  <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expression
                </label>
                <input
                  ref={expressionRef}
                  type="text"
                  value={form.expression}
                  onChange={(e) => updateForm({ expression: e.target.value })}
                  placeholder="{revenue} - {cost}"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {errors.expression && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.expression}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Use {"{column_name}"} to reference columns. Operators: + - * /
                  ( )
                </p>
              </div>

              {/* Column chips */}
              {availableColumns.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    Available columns
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableColumns.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => insertColumn(col)}
                        className="px-2 py-1 text-xs rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Format
                </label>
                <select
                  value={form.format}
                  onChange={(e) =>
                    updateForm({
                      format: e.target.value as FormState["format"],
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="number">Number</option>
                  <option value="currency">Currency</option>
                  <option value="percent">Percent</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={cancelEdit}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={saveField}
                  className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Add button */}
          {editingIndex === null && (
            <button
              onClick={startAdd}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Field
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={() => onSave(localFields)}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
