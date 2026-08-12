import { toast } from "react-toastify";

export default function useToast(title, message, code = "0") {
  let type = "info";

  switch (code) {
    case "0":
      type = "success";
      break;
    case "1":
      type = "warning";
      break;
    case "2":
      type = "info";
      break;
    default:
      type = "default";
  }

  toast[type](
    <div className="bg-gray-500 text-white p-4 rounded-lg shadow-lg">
      <h3 className="font-bold text-sm">{title}</h3>
      <p className="text-xs opacity-80 mt-1">{message}</p>
    </div>,
    {
      position: "top-right",
      autoClose: 4000,

      style: {
        background: "#6b7280",  // same as bg-gray-500
        boxShadow: "none",
      },
    }
  );
}
