const RideType = {
    FREELANCE: 'freelance',
    INHOUSE: 'inhouse',
};

const TripType = {
    RETURN: 'return',
    ONE_WAY: 'one-way',
};

const ScheduleType = {
    TWO_WEEKS: '2 weeks',
    ONE_MONTH: '1 month',
    CUSTOM: "custom"
};

const BookingStatus = {
    BOOKED: 'booked',
    ONGOING: 'ongoing',
    PAID:'paid',
    ASSIGNED: 'assigned',
    FAILED: 'payment_failed',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

const DaysOfWeek = {
    SUNDAY:'sunday',
    MONDAY:'monday',
    TUESDAY:'tuesday',
    WEDNESDAY: 'wednesday',
    THURSDAY:'thursday',
    FRIDAY: 'friday',
    SATURDAY: 'saturday',
};

module.exports = {
    RideType,
    TripType,
    ScheduleType,
    BookingStatus,
    DaysOfWeek
  };