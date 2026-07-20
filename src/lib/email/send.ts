export async function sendEmail(
  type: string,
  to: string,
  data: Record<string, string | number | undefined>
) {
  try {
    await fetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, to, data }),
    });
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

export const ADMIN_EMAIL = "producciones@unihaus.com.ar";
