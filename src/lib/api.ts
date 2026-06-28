import { toast } from "sonner";

/**
 * A wrapper around native fetch to handle global errors
 * based on the Dashly Error Dictionary.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<any> {
  try {
    const response = await fetch(input, init);
    
    // If response is not ok, try to parse JSON for backend error message
    if (!response.ok) {
      let errorData: any = null;
      try {
        errorData = await response.json();
      } catch (e) {
        // Not JSON
      }

      // 504 Gateway Timeout
      if (response.status === 504) {
        toast.error("Koneksi ke server terlalu lama. Periksa koneksi internet Anda.");
      } 
      // 500 Internal Server Error
      else if (response.status >= 500) {
        toast.error("Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.");
      }
      // If errorData has a message from our GlobalExceptionFilter, use it!
      else if (errorData && errorData.message) {
        // We trust the backend's GlobalExceptionFilter because we implemented the dictionary there
        toast.error(errorData.message);
      }
      // Fallback
      else {
        toast.error(`Terjadi kesalahan (${response.status})`);
      }

      // Reject the promise so the calling code knows it failed
      throw new Error(errorData?.message || response.statusText);
    }

    return await response.json();
  } catch (error: any) {
    // If it's a network error (like CORS or offline)
    if (error.name === "TypeError" && error.message === "Failed to fetch") {
      toast.error("Koneksi internet Anda terputus atau server tidak dapat dijangkau.");
    }
    throw error;
  }
}
