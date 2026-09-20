import { redirect } from 'next/navigation';

export default function CatalogRedirectPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const query = new URLSearchParams(searchParams as Record<string, string>).toString();
  redirect(query ? `/products?${query}` : '/products');
}
