// Private page: titled for the browser tab, kept out of search results.
export const metadata = { title: "Messages", robots: { index: false, follow: false } };

export default function Layout({ children }) {
  return children;
}
