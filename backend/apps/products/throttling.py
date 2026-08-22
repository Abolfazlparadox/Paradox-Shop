from rest_framework.throttling import UserRateThrottle


class CommentRateThrottle(UserRateThrottle):
    """
    Limits comment creation to a maximum of 5 requests per 10 minutes (600 seconds)
    per authenticated user to protect against automated spam.
    """

    scope = "comments"
    THROTTLE_RATES = {"comments": "5/600s"}

    def parse_rate(self, rate):
        if rate is None:
            return (None, None)
        num, period = rate.split("/")
        num_requests = int(num)
        if period.endswith("m"):
            duration = int(period[:-1]) * 60
        elif period.endswith("s"):
            duration = int(period[:-1])
        elif period.endswith("h"):
            duration = int(period[:-1]) * 3600
        else:
            duration = {"s": 1, "m": 60, "h": 3600, "d": 86400}.get(period[0], 600)
        return (num_requests, duration)
