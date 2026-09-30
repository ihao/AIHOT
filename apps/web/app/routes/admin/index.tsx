import { redirect } from "react-router";

// The editor's first stop is the nightly queue.
export function loader() {
  throw redirect("/admin/review");
}

export default function AdminIndex() {
  return null;
}
