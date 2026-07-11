export const productRejectionEmailTemplate = (
  productName: string,
  rejectionReason: string,
  brandName: string = 'celebs.com.np',
  brandColor: string = '#EF4444' // Red color for rejection
) => ({
  subject: `Product Submission Update: Rejection for "${productName}"`,
  text: `Your product submission for "${productName}" has been rejected. Reason: ${rejectionReason}. Please log in to your seller dashboard to edit and resubmit.`,
  html: `
      <html><head><style>
        body, html { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1); }
        .header { background-color: ${brandColor}; font-weight:bold; font-size: 20px; color: #ffffff; padding: 20px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px; }
        .content { padding: 20px; text-align: left; }
        .content h1 { font-size: 20px; color: #333333; margin-top: 0; }
        .content p { font-size: 16px; color: #666666; margin: 10px 0 20px; line-height: 1.5; }
        .reason-box { background-color: #FEF2F2; border-left: 4px solid ${brandColor}; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .reason-title { font-weight: bold; color: #991B1B; margin-bottom: 5px; }
        .reason-content { color: #7F1D1D; font-style: italic; }
        .button { display: inline-block; padding: 12px 20px; font-size: 16px; font-weight: bold; background-color: #2563EB; color: #fff!important; border-radius: 5px; text-decoration: none; text-align: center; }
        .footer { font-size: 14px; color: #999999; text-align: center; padding: 20px; border-top: 1px solid #eeeeee; margin-top: 20px; }
      </style></head><body>
        <div class="container">
          <div class="header">Product Review Update</div>
          <div class="content">
            <h1>Dear Vendor,</h1>
            <p>Thank you for submitting your product <strong>"${productName}"</strong> for review.</p>
            <p>Our quality control team has reviewed the product listing and found that it does not meet all our requirements at this time. As a result, the product status has been updated to <strong>Rejected</strong>.</p>
            
            <div class="reason-box">
              <div class="reason-title">Reason for Rejection:</div>
              <div class="reason-content">${rejectionReason || 'No specific reasons provided.'}</div>
            </div>

            <p>Please review the feedback above, make the necessary corrections to your product listing, and submit it again for review.</p>
            <div style="text-align: center;">
              <a href="${process.env.APP_ORIGIN || 'http://localhost:5173'}/products/manage" class="button">Go to Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p>If you have any questions, feel free to contact our support team.</p>
            <p>&copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
          </div>
        </div>
      </body></html>
    `,
});
