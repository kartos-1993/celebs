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
  legacyColor = '#EF4444',
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
      ? `<ul style="margin: 5px 0 10px 20px; padding: 0; color: #7F1D1D;">
        ${subcategories.map((sub) => `<li>${sub}</li>`).join('')}
       </ul>`
      : '';

  const flaggedFieldsHtml =
    flaggedFields.length > 0
      ? `<div style="margin-top: 10px;">
        <span style="font-weight: bold; color: #991B1B;">Flagged Item Fields:</span>
        <div style="margin-top: 5px;">
          ${flaggedFields.map((f) => `<span style="display: inline-block; background-color: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5; font-size: 12px; font-weight: bold; padding: 3px 8px; border-radius: 4px; margin-right: 5px; margin-bottom: 5px;">${f}</span>`).join('')}
        </div>
       </div>`
      : '';

  return {
    subject: `Product Review Update: Action Required for "${productName}"`,
    text: `Your product submission for "${productName}" has been rejected. Category: ${category || 'Quality Control'}. Reason: ${rejectionReason}. Flagged fields: ${flaggedFields.join(', ')}. Please log in to your seller dashboard to fix these items and resubmit.`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body, html { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #18181b; }
          .container { max-width: 600px; margin: 30px auto; padding: 0; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.08); }
          .header { background-color: ${brandColor}; font-weight: 700; font-size: 20px; color: #ffffff; padding: 24px; text-align: center; }
          .content { padding: 32px; text-align: left; }
          .content h1 { font-size: 18px; color: #18181b; margin-top: 0; font-weight: 600; }
          .content p { font-size: 15px; color: #52525b; margin: 12px 0 20px; line-height: 1.6; }
          .reason-box { background-color: #FEF2F2; border-left: 4px solid ${brandColor}; padding: 18px; margin: 24px 0; border-radius: 6px; }
          .reason-title { font-weight: 700; color: #991B1B; font-size: 15px; margin-bottom: 6px; }
          .reason-category { font-weight: 600; color: #B91C1C; font-size: 14px; margin-bottom: 8px; }
          .reason-content { color: #7F1D1D; font-style: normal; line-height: 1.5; font-size: 14px; }
          .button { display: inline-block; padding: 12px 24px; font-size: 15px; font-weight: 600; background-color: #2563EB; color: #ffffff !important; border-radius: 6px; text-decoration: none; text-align: center; transition: background-color 0.2s; }
          .footer { font-size: 13px; color: #71717a; text-align: center; padding: 20px; border-top: 1px solid #f4f4f5; background-color: #fafafa; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">Product Quality Control Update</div>
          <div class="content">
            <h1>Dear Vendor,</h1>
            <p>Thank you for submitting <strong>"${productName}"</strong> to the ${brandName} catalog.</p>
            <p>Our Quality Control (QC) team reviewed your listing and identified items that need correction before it can be published.</p>
            
            <div class="reason-box">
              <div class="reason-title">Quality Control Feedback</div>
              ${category ? `<div class="reason-category">Primary Category: ${category}</div>` : ''}
              ${subcategoriesHtml}
              <div class="reason-content">${rejectionReason || 'Please review quality requirements in the seller portal.'}</div>
              ${flaggedFieldsHtml}
            </div>

            <p>Please log in to your vendor dashboard to make the requested updates and re-submit your product for review.</p>
            <div style="text-align: center; margin-top: 28px;">
              <a href="${process.env.APP_ORIGIN || 'http://localhost:5173'}/products/manage" class="button">Open Vendor Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p>Need help? Contact seller support or refer to our Product Listing Guidelines.</p>
            <p>&copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
};
