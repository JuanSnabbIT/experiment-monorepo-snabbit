import json
import logging
from urllib.request import urlopen
from urllib.error import URLError

logger = logging.getLogger(__name__)

def obtener_valor_dolar():
    """
    Obtiene el valor del dólar observado desde mindicador.cl usando urllib.
    Retorna el valor como float o None si hay error.
    """
    try:
        url = 'https://mindicador.cl/api/dolar'
        with urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
        
        # La API retorna una serie de valores, tomamos el primero (más reciente)
        if 'serie' in data and len(data['serie']) > 0:
            return data['serie'][0]['valor']
            
    except (URLError, ValueError, KeyError, IndexError) as e:
        logger.error(f"Error obteniendo valor del dólar: {e}")
        return None
    except Exception as e:
        logger.error(f"Error inesperado obteniendo valor del dólar: {e}")
        return None
    
    return None
