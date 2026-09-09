import { renderButton, renderEmailLayout, renderInfoCard } from './email-layout';

import { buildWebUrl } from '@/common/utils/url';

export interface IProductRejectionParams {
  productName: string;
  rejectionReason: string;
  category?: string;
  subcategories?: string[];
  flaggedFields?: string[];
  brandName?: string;
  brandColor?: string;
}

export const productRejectionEmailTemplate = (
  paramsOrName: string | IProductRejectionParams,
  legacyReason?: string,
  legacyBrand = 'Celebs',
  legacyColor = '#0F172A',
) => {
  let productName: string;
  let rejectionReason: string;
  let category: string | undefined;
  let subcategories: string[] = [];
  let flaggedFields: string[] = [];
  let brandName = legacyBrand;
  let brandColor = legacyColor;

  if (typeof paramsOrName === 'object') {
    productName = paramsOrName.productName;
    rejectionReason = paramsOrName.rejectionReason;
    category = paramsOrName.category;
    subcategories = paramsOrName.subcategories || [];
    flaggedFields = paramsOrName.flaggedFields || [];
    brandName = paramsOrName.brandName || legacyBrand;
    brandColor = paramsOrName.brandColor || legacyColor;
  } else {
    productName = paramsOrName;
    rejectionReason = legacyReason || '';
  }

  const subcategoriesHtml =
    subcategories.length > 0
      ? `<ul style="margin: 6px 0 10px 20px; padding: 0; color: #7F1D1D; font-size: 13px;">
        ${subcategories.map((sub) => `<li>${sub}</li>`).join('')}
       </ul>`
      : '';

  const flaggedFieldsHtml =
    flaggedFields.length > 0
      ? `<div style="margin-top: 12px;">
        <span style="font-weight: 600; color: #991B1B; font-size: 12px; text-transform: uppercase;">Flagged Fields:</span>
        <div style="margin-top: 6px;">
          ${flaggedFields.map((f) => `<span style="display: inline-block; background-color: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 4px; margin-right: 5px; margin-bottom: 5px;">${f}</span>`).join('')}
        </div>
       </div>`
      : '';

  const dashboardUrl = buildWebUrl('/products/manage');
  const subject = `Product Review Update: Action Required for "${productName}"`;

  const reasonContentHtml = `
    <div style="font-weight: 700; color: #991B1B; font-size: 14px; margin-bottom: 6px;">
      Quality Control Feedback
    </div>
    ${category ? `<div style="font-weight: 500; color: #B91C1C; font-size: 13px; margin-bottom: 6px;">Category: ${category}</div>` : ''}
    ${subcategoriesHtml}
    <div style="color: #7F1D1D; font-size: 14px; line-height: 1.5;">
      ${rejectionReason || 'Please review quality requirements in the seller portal.'}
    </div>
    ${flaggedFieldsHtml}
  `;

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0F172A; line-height: 1.3;">
      Product Quality Control Update
    </h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
      Dear Vendor,
    </p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
      Thank you for submitting <strong>"${productName}"</strong> to the ${brandName} catalog. Our Quality Control (QC) team reviewed your listing and identified items that need correction before it can be published.
    </p>

    ${renderInfoCard(reasonContentHtml, 'danger')}

    <p style="margin: 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
      Please log in to your vendor dashboard to make the requested updates and resubmit your product for review.
    </p>

    <div style="text-align: center; margin: 28px 0;">
      ${renderButton('Open Vendor Dashboard', dashboardUrl)}
    </div>
  `;

  return {
    subject,
    text: `Your product submission for "${productName}" has been rejected. Category: ${category || 'Quality Control'}. Reason: ${rejectionReason}. Flagged fields: ${flaggedFields.join(', ')}. Please log in to your seller dashboard (${dashboardUrl}) to fix these items and resubmit.`,
    html: renderEmailLayout({
      title: subject,
      previewText: `Action required for product submission: ${productName}`,
      brandName,
      brandColor,
      contentHtml,
    }),
  };
};
