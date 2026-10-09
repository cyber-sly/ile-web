import { isLister, useSession } from "@/lib/useSession";
import MyViewings from "@/components/MyViewings";
import Dashboard from "@/components/dashboard/Dashboard";

// Home-seekers see their viewings here; listers see their Dashboard.
export default function ViewingsTab() {
  const { user } = useSession();
  return user && isLister(user) ? <Dashboard /> : <MyViewings />;
}
