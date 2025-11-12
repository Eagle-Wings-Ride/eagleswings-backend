const Rates = require('../../models/Rate');

// 💰 Validate and compute amount
const calculateBookingAmount = async (booking) => {
    const rates = await Rates.findOne();
    if (!rates) throw new Error('Rate configuration missing');

    const rateGroup =
        booking.ride_type === 'inhouse'
        ? rates.in_house_drivers
        : rates.freelance_drivers;

    let amount = 0;
    switch (booking.schedule_type) {
        case 'custom':
        if (!booking.number_of_days || booking.number_of_days <= 0)
            throw new Error('Invalid number of days for custom schedule');
        amount = rateGroup.daily * booking.number_of_days;
        break;
        case '2 weeks':
        amount = rateGroup.bi_weekly[booking.trip_type];
        break;
        case '1 month':
        amount = rateGroup.monthly[booking.trip_type];
        break;
        default:
        throw new Error('Invalid schedule type');
    }

    return amount;
};

module.exports = {
  calculateBookingAmount,
};