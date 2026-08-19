import React from 'react';
import { ProductDetail } from '@/types/api';

export function ProductStructuredData({ product }: { product: ProductDetail }) {
  const primaryVariant = product.variants?.[0];
  const price = primaryVariant?.final_price || product.base_price;
  const isAvailable = product.variants
    ? product.variants.some((v) => v.stock > 0)
    : product.is_active;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.short_description || product.description,
    image: product.images?.map((img) => img.image) || [],
    sku: primaryVariant?.sku || product.slug,
    brand: product.brand
      ? {
          '@type': 'Brand',
          name: product.brand.name,
        }
      : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'IRR',
      price: price,
      availability: isAvailable
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `http://localhost:3000/products/${product.slug}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
