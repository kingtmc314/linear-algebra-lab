import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Trash2,
  Download,
  BookOpen,
  FileSpreadsheet,
  File,
  Lock,
  LogIn,
  Plus,
  Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DocumentsPageProps {
  lang: "zh" | "en";
}

const CATEGORY_CONFIG = {
  notes: {
    zh: "課堂筆記",
    en: "Lecture Notes",
    icon: <BookOpen className="w-4 h-4" />,
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  syllabus: {
    zh: "課程規劃",
    en: "Syllabus",
    icon: <FileSpreadsheet className="w-4 h-4" />,
    color: "bg-green-100 text-green-700 border-green-200",
  },
  worksheet: {
    zh: "工作紙",
    en: "Worksheet",
    icon: <FileText className="w-4 h-4" />,
    color: "bg-orange-100 text-orange-700 border-orange-200",
  },
  other: {
    zh: "其他",
    en: "Other",
    icon: <File className="w-4 h-4" />,
    color: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadDialog({ lang, onSuccess }: { lang: "zh" | "en"; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    titleZh: "",
    titleEn: "",
    category: "notes" as "notes" | "syllabus" | "worksheet" | "other",
    descriptionZh: "",
    descriptionEn: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: () => {
      toast.success(lang === "zh" ? "文件上載成功" : "Document uploaded successfully");
      setOpen(false);
      setSelectedFile(null);
      setForm({ titleZh: "", titleEn: "", category: "notes", descriptionZh: "", descriptionEn: "" });
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error(lang === "zh" ? "請選擇文件" : "Please select a file");
      return;
    }
    if (!form.titleZh || !form.titleEn) {
      toast.error(lang === "zh" ? "請填寫中英文標題" : "Please fill in both titles");
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        ...form,
        filename: selectedFile.name,
        mimeType: selectedFile.type || "application/octet-stream",
        fileSize: selectedFile.size,
        fileBase64: base64,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          {lang === "zh" ? "上載文件" : "Upload Document"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{lang === "zh" ? "上載教學文件" : "Upload Teaching Document"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{lang === "zh" ? "中文標題 *" : "Chinese Title *"}</Label>
              <Input
                value={form.titleZh}
                onChange={(e) => setForm((f) => ({ ...f, titleZh: e.target.value }))}
                placeholder="例：第一章筆記"
              />
            </div>
            <div className="space-y-1">
              <Label>{lang === "zh" ? "英文標題 *" : "English Title *"}</Label>
              <Input
                value={form.titleEn}
                onChange={(e) => setForm((f) => ({ ...f, titleEn: e.target.value }))}
                placeholder="e.g. Chapter 1 Notes"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>{lang === "zh" ? "類別" : "Category"}</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm((f) => ({ ...f, category: v as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {lang === "zh" ? v.zh : v.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{lang === "zh" ? "中文說明" : "Chinese Description"}</Label>
              <Textarea
                rows={2}
                value={form.descriptionZh}
                onChange={(e) => setForm((f) => ({ ...f, descriptionZh: e.target.value }))}
                placeholder="可選"
              />
            </div>
            <div className="space-y-1">
              <Label>{lang === "zh" ? "英文說明" : "English Description"}</Label>
              <Textarea
                rows={2}
                value={form.descriptionEn}
                onChange={(e) => setForm((f) => ({ ...f, descriptionEn: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>{lang === "zh" ? "選擇文件 *" : "Select File *"}</Label>
            <div
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-accent transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="font-medium">{selectedFile.name}</span>
                  <span className="text-muted-foreground">({formatFileSize(selectedFile.size)})</span>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  <Upload className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  {lang === "zh" ? "點擊選擇文件（PDF、Word、圖片等，最大 20MB）" : "Click to select file (PDF, Word, images, max 20MB)"}
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.zip"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {lang === "zh" ? "取消" : "Cancel"}
            </Button>
            <Button type="submit" disabled={uploadMutation.isPending} className="gap-2">
              {uploadMutation.isPending ? (
                <>{lang === "zh" ? "上載中..." : "Uploading..."}</>
              ) : (
                <><Upload className="w-4 h-4" />{lang === "zh" ? "上載" : "Upload"}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DocumentCard({
  doc,
  lang,
  isAdmin,
  onDelete,
}: {
  doc: any;
  lang: "zh" | "en";
  isAdmin: boolean;
  onDelete: (id: number) => void;
}) {
  const cat = CATEGORY_CONFIG[doc.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.other;
  const title = lang === "zh" ? doc.titleZh : doc.titleEn;
  const description = lang === "zh" ? doc.descriptionZh : doc.descriptionEn;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg border ${cat.color} shrink-0`}>
              {cat.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-sm leading-snug line-clamp-2">{title}</h3>
                  {description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className={`text-xs ${cat.color}`}>
                  {lang === "zh" ? cat.zh : cat.en}
                </Badge>
                <span className="text-xs text-muted-foreground">{formatFileSize(doc.fileSize)}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(doc.createdAt).toLocaleDateString(lang === "zh" ? "zh-HK" : "en-US")}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1 text-xs"
              onClick={() => window.open(doc.storageUrl, "_blank")}
            >
              <Download className="w-3 h-3" />
              {lang === "zh" ? "下載 / 檢視" : "Download / View"}
            </Button>
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive gap-1 text-xs">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {lang === "zh" ? "確認刪除" : "Confirm Delete"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {lang === "zh"
                        ? `確定要刪除「${title}」？此操作不可撤銷。`
                        : `Are you sure you want to delete "${title}"? This action cannot be undone.`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{lang === "zh" ? "取消" : "Cancel"}</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => onDelete(doc.id)}
                    >
                      {lang === "zh" ? "刪除" : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DocumentsPage({ lang }: DocumentsPageProps) {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: docs, refetch, isLoading } = trpc.documents.list.useQuery(
    { category: categoryFilter as any },
    { refetchOnWindowFocus: false }
  );

  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => {
      toast.success(lang === "zh" ? "文件已刪除" : "Document deleted");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const categories = [
    { value: "all", zh: "全部", en: "All" },
    { value: "notes", zh: "課堂筆記", en: "Lecture Notes" },
    { value: "syllabus", zh: "課程規劃", en: "Syllabus" },
    { value: "worksheet", zh: "工作紙", en: "Worksheet" },
    { value: "other", zh: "其他", en: "Other" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold">
              {lang === "zh" ? "教學資源" : "Teaching Resources"}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {lang === "zh"
              ? "教師上載的筆記、課程規劃及工作紙，公眾可下載檢視"
              : "Notes, syllabi, and worksheets uploaded by the teacher — available for public download"}
          </p>
        </div>

        {/* Teacher controls */}
        {isAdmin ? (
          <UploadDialog lang={lang} onSuccess={refetch} />
        ) : !isAuthenticated ? (
          <Button variant="outline" className="gap-2" onClick={() => window.location.href = getLoginUrl()}>
            <LogIn className="w-4 h-4" />
            {lang === "zh" ? "教師登入" : "Teacher Login"}
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />
            {lang === "zh" ? "僅教師可上載文件" : "Only teachers can upload documents"}
          </div>
        )}
      </div>

      {/* Admin notice */}
      {isAdmin && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-2 text-sm">
          <Lock className="w-4 h-4 text-primary" />
          <span>
            {lang === "zh"
              ? "您已以教師身份登入，可上載及管理文件"
              : "You are logged in as teacher — you can upload and manage documents"}
          </span>
        </div>
      )}

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        {categories.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategoryFilter(c.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 active:scale-95 ${
              categoryFilter === c.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-accent"
            }`}
          >
            {lang === "zh" ? c.zh : c.en}
          </button>
        ))}
      </div>

      {/* Document grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-32 bg-muted/30 rounded-lg" />
            </Card>
          ))}
        </div>
      ) : !docs || docs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">
            {lang === "zh" ? "暫無文件" : "No documents yet"}
          </p>
          <p className="text-sm mt-1">
            {isAdmin
              ? (lang === "zh" ? "點擊「上載文件」開始添加教學資源" : "Click 'Upload Document' to add teaching resources")
              : (lang === "zh" ? "教師尚未上載任何文件" : "The teacher has not uploaded any documents yet")}
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                lang={lang}
                isAdmin={isAdmin}
                onDelete={(id) => deleteMutation.mutate({ id })}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Stats footer */}
      {docs && docs.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {lang === "zh"
            ? `共 ${docs.length} 份文件`
            : `${docs.length} document${docs.length !== 1 ? "s" : ""} total`}
        </p>
      )}
    </div>
  );
}
