import notificationapi from 'notificationapi-node-server-sdk';

// Initialize NotificationAPI with credentials from environment variables
const clientId = process.env.NOTIFICATIONAPI_CLIENT_ID;
const clientSecret = process.env.NOTIFICATIONAPI_CLIENT_SECRET;

if (clientId && clientSecret) {
  notificationapi.init(clientId, clientSecret);
} else {
  console.warn(
    '[notifications] NotificationAPI credentials not configured. Notifications will be disabled.',
  );
}

/**
 * Send a payment confirmation notification
 * @param {Object} params - Payment notification parameters
 * @param {string} params.userEmail - User's email address
 * @param {string} [params.userPhone] - User's phone number (optional)
 * @param {string} params.eventName - Name of the event
 * @param {number|string} params.amount - Payment amount
 * @param {string} [params.currency='USD'] - Payment currency
 * @param {string} [params.paymentId] - Payment ID
 */
export async function sendPaymentConfirmation({
  userEmail,
  userPhone,
  eventName,
  amount,
  currency = 'USD',
  paymentId,
}) {
  if (!clientId || !clientSecret) {
    console.warn(
      '[notifications] Skipping payment notification - NotificationAPI not configured',
    );
    return;
  }

  if (!userEmail) {
    console.warn(
      '[notifications] Skipping payment notification - no email provided',
    );
    return;
  }

  try {
    const to = {
      id: userEmail,
      email: userEmail,
    };

    if (userPhone) {
      to.number = userPhone;
    }

    const formattedAmount =
      typeof amount === 'number' ? amount.toFixed(2) : amount;

    await notificationapi.send({
      type: 'concertify',
      to,
      email: {
        subject: 'Payment Confirmed - Concertify',
        html: `
          <h2>Payment Confirmed!</h2>
          <p>Thank you for your payment. Your reservation is being processed.</p>
          <br>
          <p><strong>Event:</strong> ${eventName || 'N/A'}</p>
          <p><strong>Amount:</strong> ${formattedAmount} ${currency}</p>
          ${paymentId ? `<p><strong>Payment ID:</strong> ${paymentId}</p>` : ''}
          <br>
          <p>You will receive another notification once your reservation is approved.</p>
          <br>
          <p>If you have any questions, please contact our support team.</p>
          <br>
          <p>Best regards,<br>Concertify Team</p>
        `,
      },
      sms: userPhone
        ? {
            message: `Payment confirmed for ${
              eventName || 'your event'
            }. Amount: ${formattedAmount} ${currency}. You'll receive another notification when your reservation is approved. - Concertify`,
          }
        : undefined,
    });

    console.log('[notifications] Payment confirmation sent to', userEmail);
  } catch (error) {
    console.error(
      '[notifications] Failed to send payment confirmation:',
      error?.message || error,
    );
  }
}

/**
 * Send a reservation approval notification
 * @param {Object} params - Reservation approval notification parameters
 * @param {string} params.userEmail - User's email address
 * @param {string} [params.userPhone] - User's phone number (optional)
 * @param {string} params.eventName - Name of the event
 * @param {number|string} params.reservationId - Reservation ID
 * @param {Array|string} [params.seats] - Reserved seats (array or comma-separated string)
 * @param {number|string} [params.total] - Total amount paid
 * @param {string} [params.currency='USD'] - Currency
 */
export async function sendReservationApproval({
  userEmail,
  userPhone,
  eventName,
  reservationId,
  seats,
  total,
  currency = 'USD',
}) {
  if (!clientId || !clientSecret) {
    console.warn(
      '[notifications] Skipping reservation approval notification - NotificationAPI not configured',
    );
    return;
  }

  if (!userEmail) {
    console.warn(
      '[notifications] Skipping reservation approval notification - no email provided',
    );
    return;
  }

  try {
    const to = {
      id: userEmail,
      email: userEmail,
    };

    if (userPhone) {
      to.number = userPhone;
    }

    // Format seats
    let seatList = '';
    if (Array.isArray(seats)) {
      seatList = seats.join(', ');
    } else if (typeof seats === 'string') {
      try {
        const parsed = JSON.parse(seats);
        seatList = Array.isArray(parsed) ? parsed.join(', ') : seats;
      } catch {
        seatList = seats;
      }
    }

    const formattedTotal =
      total != null
        ? typeof total === 'number'
          ? total.toFixed(2)
          : total
        : '';

    await notificationapi.send({
      type: 'concertify',
      to,
      email: {
        subject: 'Reservation Approved - Concertify',
        html: `
          <h2>🎉 Your Reservation Has Been Approved!</h2>
          <p>Great news! Your reservation has been confirmed.</p>
          <br>
          <p><strong>Event:</strong> ${eventName || 'N/A'}</p>
          <p><strong>Reservation ID:</strong> #${reservationId}</p>
          ${seatList ? `<p><strong>Seats:</strong> ${seatList}</p>` : ''}
          ${
            formattedTotal
              ? `<p><strong>Total Paid:</strong> ${formattedTotal} ${currency}</p>`
              : ''
          }
          <br>
          <p>Please arrive on time for the event. We look forward to seeing you there!</p>
          <br>
          <p>If you have any questions, please contact our support team.</p>
          <br>
          <p>Best regards,<br>Concertify Team</p>
        `,
      },
      sms: userPhone
        ? {
            message: `🎉 Reservation approved! Event: ${
              eventName || 'your event'
            }. Reservation #${reservationId}.${
              seatList ? ` Seats: ${seatList}.` : ''
            } See you there! - Concertify`,
          }
        : undefined,
    });

    console.log('[notifications] Reservation approval sent to', userEmail);
  } catch (error) {
    console.error(
      '[notifications] Failed to send reservation approval:',
      error?.message || error,
    );
  }
}
