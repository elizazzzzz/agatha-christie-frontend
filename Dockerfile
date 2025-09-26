# 使用一个轻量级的Nginx镜像作为基础
FROM nginx:alpine

# 将你的项目文件复制到Nginx的默认目录
COPY . /usr/share/nginx/html