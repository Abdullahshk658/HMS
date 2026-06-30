#import get_logs function from database.py
from database import get_logs
def get_logs_handler():
    #call get_logs function from database.py and return the result
    logs = get_logs(limit=100, name='', timestamp='', status='', anomaly=None)
    return logs                         
