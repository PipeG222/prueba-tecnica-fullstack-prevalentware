// components/ui/ToggleRoleButton.tsx
import { useState } from "react";

export function ToggleRoleButton({ userId, role, onChanged }: { userId: string; role: "ADMIN" | "USER"; onChanged: (next: "ADMIN" | "USER") => void; }) {
  const [loading, setLoading] = useState(false);
  const next = role === "ADMIN" ? "USER" : "ADMIN";

  const doToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "POST",
        headers: {
          "x-dev-user-email": "admin.demo@example.com", // quítalo cuando uses auth real
        },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error ?? "Error cambiando rol");
      } else {
        onChanged(data.role);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={doToggle}
      disabled={loading}
      className="px-2 py-1 rounded bg-indigo-600 text-white text-xs"
      title={`Cambiar a ${next}`}
    >
      {loading ? "Cambiando..." : `Hacer ${next}`}
    </button>
  );
}
