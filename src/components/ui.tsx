import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "soft" | "danger";
  size?: "default" | "small" | "icon";
  children: ReactNode;
}

export function Button({ variant = "primary", size = "default", className = "", children, ...props }: ButtonProps) {
  return <button className={`btn btn-${variant} btn-${size} ${className}`.trim()} {...props}>{children}</button>;
}

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div className="field">
      <div className="field-label-row">
        {htmlFor ? <label className="field-label" htmlFor={htmlFor}>{label}</label> : <span className="field-label">{label}</span>}
        {hint ? <span className="field-hint">{hint}</span> : null}
      </div>
      {children}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`text-input ${props.className ?? ""}`.trim()} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`text-input select-input ${props.className ?? ""}`.trim()} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`text-input text-area ${props.className ?? ""}`.trim()} />;
}

export function Divider() {
  return <div className="divider" aria-hidden="true" />;
}
