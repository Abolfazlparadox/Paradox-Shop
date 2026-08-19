import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { productsApi } from '@/lib/api/endpoints';
import { ProductDetailView } from '@/features/product/components/ProductDetailView';
import { ProductStructuredData } from '@/features/product/components/ProductStructuredData';

interface ProductPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  try {
    const product = await productsApi.getBySlug(params.slug);
    const title = `${product.name} | PARADOX SHOP`;
    const description = product.short_description || product.description?.slice(0, 160) || 'Engineered luxury artifact.';
    const primaryImage = product.images?.[0]?.image;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        images: primaryImage ? [{ url: primaryImage }] : undefined,
      },
    };
  } catch {
    return {
      title: 'Artifact Not Found | PARADOX SHOP',
      description: 'The requested artifact could not be located.',
    };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  let product;
  try {
    product = await productsApi.getBySlug(params.slug);
  } catch (err: any) {
    if (err.response?.status === 404) {
      notFound();
    }
    throw err;
  }

  if (!product) {
    notFound();
  }

  return (
    <main className="py-10 sm:py-16 bg-bg-primary">
      <Container size="lg">
        <ProductStructuredData product={product} />
        <ProductDetailView product={product} />
      </Container>
    </main>
  );
}
